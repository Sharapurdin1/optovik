// Приём заказа и отправка его владельцу магазина в Telegram.
//
// Как это работает:
//   1) браузер отправляет сюда заказ (POST /api/order);
//   2) сервер пересылает его в Telegram через бота.
//
// Нужны две настройки в файле .env.local (см. .env.local.example):
//   TELEGRAM_BOT_TOKEN — токен бота от @BotFather
//   TELEGRAM_CHAT_ID   — id чата/группы, куда слать заказы
//
// БЕЗОПАСНОСТЬ: цены и суммы из браузера НЕ используются. Сервер сам берёт
// актуальные цены из каталога (getCatalog) по id товара и пересчитывает
// итог и доставку — подделать сумму из браузера нельзя.

import { db, schema } from "@/db";
import { getCatalog } from "@/lib/catalog";
import { calcDeliveryFee, isOpenNow, type Settings } from "@/lib/settings";
import { getSettings } from "@/lib/settings-server";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

type OrderItem = {
  productId?: string;
  title: string;
  unit: string;
  price: number;
  quantity: number;
};

type OrderPayload = {
  id?: string;
  createdAt?: string;
  status?: string;
  items: OrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    street?: string;
    payment: string;
    comment: string;
  };
};

// Сохраняем заказ в базу данных. Ошибку не пробрасываем наружу:
// заказ уже ушёл владельцу в Telegram, терять уведомление из-за базы нельзя.
async function saveOrder(order: OrderPayload): Promise<void> {
  const c = order.customer;
  const id = order.id?.trim() || String(Date.now());
  await db.insert(schema.orders).values({
    id,
    createdAt: order.createdAt?.trim() || new Date().toISOString(),
    name: c.name.trim(),
    phone: c.phone.trim(),
    address: c.address.trim(),
    street: c.street?.trim() || null,
    payment: c.payment,
    comment: c.comment?.trim() ?? "",
    itemsTotal: order.itemsTotal,
    deliveryFee: order.deliveryFee,
    total: order.total,
    status: order.status?.trim() || "Принят",
  });
  if (order.items.length > 0) {
    await db.insert(schema.orderItems).values(
      order.items.map((it) => ({
        orderId: id,
        title: it.title,
        unit: it.unit,
        price: it.price,
        quantity: it.quantity,
      }))
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

// Собираем красивое сообщение для Telegram.
function buildMessage(order: OrderPayload): string {
  const c = order.customer;
  const lines = order.items
    .map(
      (it) =>
        `• ${escapeHtml(it.title)} — ${it.quantity} × ${formatRub(it.price)} = <b>${formatRub(
          it.price * it.quantity
        )}</b>`
    )
    .join("\n");

  const delivery =
    order.deliveryFee === 0 ? "Бесплатно" : formatRub(order.deliveryFee);

  return [
    "🛒 <b>Новый заказ</b>",
    "",
    lines,
    "",
    `Товары: ${formatRub(order.itemsTotal)}`,
    `Доставка: ${delivery}`,
    `<b>Итого: ${formatRub(order.total)}</b>`,
    "",
    "👤 <b>Покупатель</b>",
    `Имя: ${escapeHtml(c.name)}`,
    `Телефон: ${escapeHtml(c.phone)}`,
    `Адрес: ${escapeHtml(c.address)}`,
    `Оплата: ${escapeHtml(c.payment)}`,
    c.comment ? `Комментарий: ${escapeHtml(c.comment)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// Пересчёт заказа по каталогу: берём НАСТОЯЩИЕ цены из каталога по id товара
// и считаем суммы заново. Цены/итоги из браузера полностью игнорируются.
async function recomputeOrder(
  order: OrderPayload,
  settings: Settings
): Promise<OrderPayload | null> {
  const { products } = await getCatalog();
  const byId = new Map(products.map((p) => [p.id, p]));

  const items: OrderItem[] = [];
  for (const it of order.items) {
    const prod = it.productId ? byId.get(it.productId) : undefined;
    if (!prod) continue; // товара нет в каталоге — не берём
    const qty = Math.max(1, Math.min(99, Math.floor(Number(it.quantity) || 0)));
    items.push({
      productId: prod.id,
      title: prod.title,
      unit: prod.unit,
      price: prod.price, // цена из каталога, а не из браузера
      quantity: qty,
    });
  }
  if (items.length === 0) return null;

  const itemsTotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const deliveryFee = calcDeliveryFee(itemsTotal, settings);
  return {
    ...order,
    items,
    itemsTotal,
    deliveryFee,
    total: itemsTotal + deliveryFee,
  };
}

// Простая проверка, что заказ вообще пригоден к отправке.
function isValid(order: OrderPayload): boolean {
  if (!order || !Array.isArray(order.items) || order.items.length === 0)
    return false;
  const c = order.customer;
  if (!c) return false;
  return Boolean(c.name?.trim() && c.phone?.trim() && c.address?.trim());
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    // Бот ещё не настроен — честно сообщаем об этом.
    return Response.json(
      {
        ok: false,
        error:
          "Приём заказов не настроен. Добавьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в .env.local",
      },
      { status: 503 }
    );
  }

  // Антиспам заказов: не больше 30 с одного устройства в час.
  const lim = await rateLimit(`order:ip:${clientIp(req)}`, 30, 60 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec, "заказов");

  let order: OrderPayload;
  try {
    order = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Некорректные данные" }, { status: 400 });
  }

  if (!isValid(order)) {
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

  // Пересчитываем цены и суммы на сервере — источник истины, не браузер.
  const trusted = await recomputeOrder(order, settings);
  if (!trusted) {
    return Response.json(
      { ok: false, error: "Корзина пуста или товары недоступны" },
      { status: 400 }
    );
  }
  if (settings.minOrder > 0 && trusted.itemsTotal < settings.minOrder) {
    return Response.json(
      { ok: false, error: `Минимальный заказ ${settings.minOrder} ₽` },
      { status: 400 }
    );
  }

  // 1) СНАЧАЛА сохраняем заказ в базу — это источник истины. Если не удалось
  //    сохранить, заказ не принят: честно просим повторить.
  try {
    await saveOrder(trusted);
  } catch (e) {
    console.error("Не удалось сохранить заказ в базу:", e);
    return Response.json(
      { ok: false, error: "Не удалось принять заказ. Попробуйте ещё раз" },
      { status: 500 }
    );
  }

  // 2) ЗАТЕМ уведомляем владельца в Telegram. Сбой здесь заказ НЕ теряет —
  //    он уже в базе и виден в панели /manage.
  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildMessage(trusted),
          parse_mode: "HTML",
        }),
      }
    );
    if (!tgRes.ok) {
      console.error(
        "⚠️ Заказ сохранён, но Telegram-уведомление не отправлено:",
        await tgRes.text()
      );
    }
  } catch (e) {
    console.error(
      "⚠️ Заказ сохранён, но Telegram недоступен (уведомление не ушло):",
      e
    );
  }

  return Response.json({ ok: true });
}
