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
// ВАЖНО (на будущее): сейчас цены приходят из браузера и мы им доверяем.
// Когда появится база данных, суммы нужно будет пересчитывать здесь,
// на сервере, чтобы их нельзя было подделать.

type OrderItem = {
  title: string;
  unit: string;
  price: number;
  quantity: number;
};

type OrderPayload = {
  items: OrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  customer: {
    name: string;
    phone: string;
    address: string;
    payment: string;
    comment: string;
  };
};

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

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: buildMessage(order),
          parse_mode: "HTML",
        }),
      }
    );

    if (!tgRes.ok) {
      const details = await tgRes.text();
      console.error("Telegram error:", details);
      return Response.json(
        { ok: false, error: "Не удалось отправить заказ. Попробуйте ещё раз" },
        { status: 502 }
      );
    }

    return Response.json({ ok: true });
  } catch (e) {
    console.error("Order send failed:", e);
    return Response.json(
      { ok: false, error: "Сервис временно недоступен" },
      { status: 500 }
    );
  }
}
