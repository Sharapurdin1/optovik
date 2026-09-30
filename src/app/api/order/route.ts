// Приём заказа покупателя (POST /api/order).
//
// Как это работает:
//   1) проверяем часы работы, минимальную сумму и антиспам;
//   2) пересчитываем цены по каталогу из базы — цены и суммы из браузера
//      НЕ используются, подделать сумму нельзя;
//   3) сохраняем заказ и списываем остатки ОДНОЙ транзакцией: если какого-то
//      товара не хватает, заказ не создаётся и покупатель видит, чего нет;
//   4) после ответа покупателю шлём владельцу уведомление в Telegram со
//      ссылкой на заказ в админке (при сбое связи — с повторами). Сбой
//      Telegram заказ не ломает — он уже в базе.

import { after } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { getCatalog } from "@/lib/catalog";
import { calcDeliveryFee, isOpenNow, type Settings } from "@/lib/settings";
import { getSettings } from "@/lib/settings-server";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { InsufficientStockError, changeStock } from "@/lib/stock";
import { isUniqueViolation } from "@/lib/catalog-admin";
import { notifyNewOrder, type TrustedOrder, type TrustedItem } from "@/lib/telegram";
import { formatPhone, normalizePhone } from "@/lib/phone";

// Что принимаем от браузера. Длины ограничены: иначе можно залить в базу
// мегабайты текста, а слишком длинное сообщение Telegram не примет —
// владелец не узнал бы о заказе.
const text = (max: number) => z.string().trim().max(max);
const OrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().max(200),
        quantity: z.coerce.number().catch(1),
      })
    )
    .min(1)
    .max(200),
  customer: z.object({
    name: text(100).min(1),
    phone: z.string().max(30),
    address: text(500).min(1),
    street: text(300).optional(),
    payment: z.enum(["Наличными курьеру", "Картой курьеру"]),
    comment: text(1000).default(""),
  }),
});
type OrderPayload = z.infer<typeof OrderSchema>;

const FIELD_NAMES: Record<string, string> = {
  name: "Имя",
  address: "Адрес",
  street: "Адрес",
  comment: "Комментарий",
};

// Понятный текст ошибки для покупателя.
function payloadError(issues: z.core.$ZodIssue[]): string {
  const long = issues.find((i) => i.code === "too_big" && i.path[0] === "customer");
  if (long) return `Слишком длинный текст в поле «${FIELD_NAMES[String(long.path[1])] ?? "заказа"}»`;
  if (issues.some((i) => i.code === "too_big" && i.path[0] === "items")) {
    return "Слишком много позиций в одном заказе";
  }
  return "Заполните имя, телефон и адрес";
}

class OrderError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// Пересчёт заказа по каталогу: берём НАСТОЯЩИЕ цены по id товара.
async function recomputeOrder(
  order: OrderPayload,
  settings: Settings
): Promise<Omit<TrustedOrder, "id">> {
  const { products } = await getCatalog();
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: TrustedItem[] = [];
  for (const it of order.items) {
    const prod = it.productId ? byId.get(it.productId) : undefined;
    if (!prod) continue; // товара нет (или скрыт) — не берём
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.quantity) || 0)));
    if (prod.stock !== null && prod.stock < qty) {
      throw new OrderError(
        prod.stock === 0
          ? `«${prod.title}» закончился — уберите его из корзины`
          : `«${prod.title}»: в наличии только ${prod.stock}`,
        409
      );
    }
    items.push({
      productId: prod.id,
      title: prod.title,
      unit: prod.unit,
      price: prod.price, // цена из каталога, а не из браузера
      quantity: qty,
    });
  }
  if (items.length === 0) {
    throw new OrderError("Корзина пуста или товары недоступны");
  }

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (settings.minOrder > 0 && itemsTotal < settings.minOrder) {
    throw new OrderError(`Минимальный заказ ${settings.minOrder} ₽`);
  }
  const deliveryFee = calcDeliveryFee(itemsTotal, settings);
  return {
    items,
    itemsTotal,
    deliveryFee,
    total: itemsTotal + deliveryFee,
    customer: order.customer,
  };
}

// Сохраняем заказ и списываем остатки одной транзакцией.
// Время и статус («Принят») ставит база.
async function saveOrder(order: TrustedOrder): Promise<void> {
  const c = order.customer;
  await db.transaction(async (tx) => {
    await tx.insert(schema.orders).values({
      id: order.id,
      name: c.name.trim(),
      phone: c.phone.trim(),
      address: c.address.trim(),
      street: c.street?.trim() || null,
      payment: c.payment,
      comment: c.comment?.trim() ?? "",
      itemsTotal: order.itemsTotal,
      deliveryFee: order.deliveryFee,
      total: order.total,
    });
    await tx
      .insert(schema.orderItems)
      .values(order.items.map((it) => ({ orderId: order.id, ...it })));
    for (const it of order.items) {
      await changeStock(tx, it.productId, -it.quantity, "Продажа", { orderId: order.id });
    }
  });
}

// Номер заказа — метка времени (по порядку). Если два заказа пришли
// в одну миллисекунду, берём следующий номер.
async function saveWithFreshId(order: Omit<TrustedOrder, "id">): Promise<TrustedOrder> {
  let id = Date.now();
  for (let attempt = 0; ; attempt++) {
    const full = { ...order, id: String(id) };
    try {
      await saveOrder(full);
      return full;
    } catch (e) {
      if (attempt < 3 && isUniqueViolation(e)) {
        id++;
        continue;
      }
      throw e;
    }
  }
}

export async function POST(req: Request) {
  // Антиспам заказов: не больше 30 с одного устройства в час.
  const lim = await rateLimit(`order:ip:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec, "заказов");

  const parsed = OrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: payloadError(parsed.error.issues) }, { status: 400 });
  }
  const payload = parsed.data;
  // Номер — строго +7 и 10 цифр; сохраняем в едином виде +7 999 123 45 67.
  const phone = normalizePhone(payload.customer.phone);
  if (!phone) {
    return Response.json(
      { ok: false, error: "Проверьте номер телефона: нужно 10 цифр после +7" },
      { status: 400 }
    );
  }
  payload.customer.phone = formatPhone(phone);

  // Настройки магазина: часы работы и минимальный заказ проверяем на сервере.
  const settings = await getSettings();
  if (!isOpenNow(settings)) {
    return Response.json(
      {
        ok: false,
        error: settings.acceptingOrders
          ? `Магазин закрыт. Приём заказов с ${settings.workFrom} до ${settings.workTo}.`
          : "Приём заказов временно приостановлен.",
      },
      { status: 403 }
    );
  }

  let order: TrustedOrder;
  try {
    order = await saveWithFreshId(await recomputeOrder(payload, settings));
  } catch (e) {
    if (e instanceof OrderError) {
      return Response.json({ ok: false, error: e.message }, { status: e.status });
    }
    if (e instanceof InsufficientStockError) {
      // Товар раскупили, пока покупатель оформлял заказ.
      return Response.json(
        {
          ok: false,
          error:
            e.available === 0
              ? `«${e.title}» закончился — уберите его из корзины`
              : `«${e.title}»: в наличии только ${e.available}`,
        },
        { status: 409 }
      );
    }
    console.error("Не удалось сохранить заказ в базу:", e);
    return Response.json(
      { ok: false, error: "Не удалось принять заказ. Попробуйте ещё раз" },
      { status: 500 }
    );
  }

  // Уведомление владельцу — уже после ответа покупателю: повторы при сбое
  // связи не заставляют его ждать. Ошибки внутри только логируются.
  after(() => notifyNewOrder(order));

  // Отдаём то, что реально сохранено: номер, позиции и суммы по ценам каталога.
  return Response.json({
    ok: true,
    id: order.id,
    items: order.items,
    itemsTotal: order.itemsTotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
  });
}
