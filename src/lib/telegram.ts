// Уведомления владельцу в Telegram о новых заказах.
//
// Сообщение содержит весь заказ (товары, суммы, покупатель, адрес, оплата)
// и кнопку «Открыть заказ в админке» — там меняется статус.
// Серверы Telegram за рубежом: это трансграничная передача персональных
// данных (152-ФЗ) — она должна быть указана в политике и уведомлении в РКН.
//
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

const MAX_MESSAGE = 3800; // лимит Telegram — 4096 символов, берём с запасом

// Полное сообщение о заказе. Экранируем всё, что ввёл покупатель (HTML).
export function buildOrderMessage(order: TrustedOrder): string {
  const c = order.customer;
  const head = [`🛒 <b>Новый заказ №${escapeHtml(order.id)}</b>`, ""];
  const tail = [
    "",
    `Товары: ${formatRub(order.itemsTotal)}`,
    `Доставка: ${order.deliveryFee === 0 ? "бесплатно" : formatRub(order.deliveryFee)}`,
    `<b>Итого: ${formatRub(order.total)}</b>`,
    "",
    `👤 ${escapeHtml(c.name)}`,
    `📞 ${escapeHtml(c.phone)}`,
    `📍 ${escapeHtml(c.address)}`,
    `💳 ${escapeHtml(c.payment)}`,
  ];
  if (c.comment?.trim()) tail.push(`💬 ${escapeHtml(c.comment.trim())}`);

  const lines = order.items.map(
    (it) =>
      `• ${escapeHtml(it.title)} (${escapeHtml(it.unit)}) — ${it.quantity} × ${formatRub(it.price)} = <b>${formatRub(it.price * it.quantity)}</b>`
  );

  // Очень большой заказ: показываем начало списка, остальное — в админке.
  const fixed = head.join("\n").length + tail.join("\n").length + 60;
  const shown: string[] = [];
  let used = fixed;
  for (const line of lines) {
    if (used + line.length + 1 > MAX_MESSAGE) break;
    shown.push(line);
    used += line.length + 1;
  }
  if (shown.length < lines.length) {
    shown.push(`…и ещё ${lines.length - shown.length} поз. — полный список в админке`);
  }

  return [...head, ...shown, ...tail].join("\n");
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
