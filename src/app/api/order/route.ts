// Приём заказа покупателя (POST /api/order).
//
// Как это работает:
//   1) проверяем часы работы, минимальную сумму и антиспам;
//   2) пересчитываем цены по каталогу из базы — цены и суммы из браузера
//      НЕ используются, подделать сумму нельзя;
//   3) сохраняем заказ и списываем остатки ОДНОЙ транзакцией: если какого-то
//      товара не хватает, заказ не создаётся и покупатель видит, чего нет;
//   4) шлём владельцу короткое уведомление в Telegram со ссылкой на заказ
//      в админке. Сбой Telegram заказ не ломает — он уже в базе.

import { db, schema } from "@/db";
import { getCatalog } from "@/lib/catalog";
import { calcDeliveryFee, isOpenNow, type Settings } from "@/lib/settings";
import { getSettings } from "@/lib/settings-server";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { InsufficientStockError, changeStock } from "@/lib/stock";
import { isUniqueViolation } from "@/lib/catalog-admin";
import { notifyNewOrder, type TrustedOrder, type TrustedItem } from "@/lib/telegram";

type OrderPayload = {
  items: { productId?: string; quantity?: number }[];
  customer: TrustedOrder["customer"];
};

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

// Простая проверка, что заказ вообще пригоден к отправке.
function isValid(order: OrderPayload | null): order is OrderPayload {
  if (!order || !Array.isArray(order.items) || order.items.length === 0) return false;
  const c = order.customer;
  if (!c || typeof c !== "object") return false;
  const filled = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  return filled(c.name) && filled(c.phone) && filled(c.address) && typeof c.payment === "string";
}

export async function POST(req: Request) {
  // Антиспам заказов: не больше 30 с одного устройства в час.
  const lim = await rateLimit(`order:ip:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec, "заказов");

  const payload = (await req.json().catch(() => null)) as OrderPayload | null;
  if (!isValid(payload)) {
    return Response.json(
      { ok: false, error: "Заполните имя, телефон и адрес" },
      { status: 400 }
    );
  }

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

  // Уведомление владельцу. Ошибки внутри только логируются.
  await notifyNewOrder(order);

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
