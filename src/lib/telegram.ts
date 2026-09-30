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

// Паузы между повторами, если Telegram не ответил (из России он доступен
// только по IPv6, а IPv6 у хостинга бывает нестабилен). В сумме ~3,5 мин.
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 120_000];

type Attempt = "sent" | "retry" | "failed";

async function sendOnce(payload: object): Promise<Attempt> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const api = (process.env.TELEGRAM_API_URL ?? "https://api.telegram.org").replace(/\/+$/, "");
    const res = await fetch(`${api}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return "sent";
    const why = await res.text();
    // 429 — «слишком часто», 5xx — сбой у Telegram: стоит повторить.
    // Остальное (например, ошибка в тексте) повтором не исправить.
    if (res.status === 429 || res.status >= 500) {
      console.warn("⚠️ Telegram временно не принял сообщение:", why);
      return "retry";
    }
    console.error("⚠️ Telegram ответил ошибкой:", why);
    return "failed";
  } catch (e) {
    console.warn("⚠️ Telegram недоступен:", e);
    return "retry";
  }
}

// Отправить сообщение владельцу. Никогда не бросает ошибку — возвращает,
// получилось ли. button — кнопка-ссылка под сообщением (только https).
// retry — повторять при сбое связи (для заказов; тревогам не нужно).
export async function sendTelegram(
  text: string,
  button?: { text: string; url: string },
  { retry = false }: { retry?: boolean } = {}
): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return false;

  const withButton = button?.url.startsWith("https://");
  const body = withButton ? text : button ? `${text}\n\n🔗 ${escapeHtml(button.url)}` : text;
  const payload = {
    chat_id: chatId,
    text: body,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(withButton && {
      reply_markup: { inline_keyboard: [[{ text: button!.text, url: button!.url }]] },
    }),
  };

  const delays = retry ? RETRY_DELAYS_MS : [];
  for (let attempt = 0; ; attempt++) {
    const result = await sendOnce(payload);
    if (result === "sent") return true;
    if (result === "failed" || attempt >= delays.length) return false;
    await new Promise((r) => setTimeout(r, delays[attempt]));
  }
}

// Уведомление о новом заказе. Заказ к этому моменту уже сохранён в базе.
// Вызывается после ответа покупателю — повторы его не задерживают.
export async function notifyNewOrder(order: TrustedOrder): Promise<void> {
  const sent = await sendTelegram(
    buildOrderMessage(order),
    { text: "Открыть заказ в админке", url: adminOrderUrl(order.id) },
    { retry: true }
  );
  if (!sent) console.error(`Заказ ${order.id} сохранён, но уведомление в Telegram не ушло`);
}

// Экранирование для текстов тревог (alerts.ts).
export { escapeHtml };
