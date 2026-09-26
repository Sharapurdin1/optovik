// Уведомления владельцу в Telegram.
//
// Telegram — только «звонок»: пришёл новый заказ. Полный состав заказа,
// телефон и адрес — в админке по ссылке из сообщения.
// Настройки: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, APP_URL (адрес сайта).
// TELEGRAM_API_URL — необязательный адрес прокси к Bot API (если из России
// перестанет открываться api.telegram.org).

import "server-only";

export type TrustedItem = {
  productId: string;
  title: string;
  unit: string;
  price: number;
  quantity: number;
};

export type TrustedOrder = {
  id: string;
  items: TrustedItem[];
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

export function adminOrderUrl(id: string): string {
  const base = (process.env.APP_URL ?? "").replace(/\/+$/, "");
  return `${base}/manage/orders/${encodeURIComponent(id)}`;
}

// Короткое сообщение: сумма, сколько позиций, район доставки.
export function buildOrderMessage(order: TrustedOrder): string {
  const count = order.items.reduce((s, i) => s + i.quantity, 0);
  const where = order.customer.street?.trim() || order.customer.address.trim();
  return [
    `🛒 <b>Новый заказ №${escapeHtml(order.id)}</b>`,
    `💰 ${formatRub(order.total)} · ${count} шт. · ${escapeHtml(order.customer.payment)}`,
    `📍 ${escapeHtml(where)}`,
  ].join("\n");
}

// Отправить уведомление. Никогда не бросает ошибку: заказ уже сохранён.
export async function notifyNewOrder(order: TrustedOrder): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(`Заказ ${order.id} сохранён, но Telegram не настроен — уведомления нет`);
    return;
  }

  const url = adminOrderUrl(order.id);
  // Кнопка-ссылка работает только с публичным https-адресом; иначе — ссылка в тексте.
  const canButton = url.startsWith("https://");
  const text = canButton
    ? buildOrderMessage(order)
    : `${buildOrderMessage(order)}\n\n🔗 ${escapeHtml(url)}`;

  try {
    const api = (process.env.TELEGRAM_API_URL ?? "https://api.telegram.org").replace(/\/+$/, "");
    const res = await fetch(`${api}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(canButton && {
          reply_markup: {
            inline_keyboard: [[{ text: "Открыть заказ в админке", url }]],
          },
        }),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error(`⚠️ Заказ ${order.id} сохранён, но Telegram ответил:`, await res.text());
    }
  } catch (e) {
    console.error(`⚠️ Заказ ${order.id} сохранён, но Telegram недоступен:`, e);
  }
}
