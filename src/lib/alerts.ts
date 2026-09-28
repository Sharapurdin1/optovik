// Тревоги владельцу в Telegram: ошибки на сервере.
//
// Чтобы не заспамить чат: одна и та же ошибка — не чаще раза в 15 минут,
// всего — не больше 20 сообщений в час. Сканеры-боты, которые долбят сайт
// фальшивыми запросами, в тревоги не попадают.

import "server-only";
import { escapeHtml, sendTelegram } from "./telegram";

const SAME_ERROR_PAUSE_MS = 15 * 60 * 1000;
const MAX_PER_HOUR = 20;

const lastSent = new Map<string, number>();
let hourStart = Date.now();
let sentThisHour = 0;

// Шум от ботов-сканеров: запросы к несуществующим Server Actions и т.п.
const NOISE = [/Server Reference ID/i, /failed-to-find-server-action/i, /Failed to find Server Action/i];

export async function alertServerError(
  message: string,
  where: string,
  digest?: string
): Promise<void> {
  if (NOISE.some((re) => re.test(message))) return;

  const now = Date.now();
  if (now - hourStart > 60 * 60 * 1000) {
    hourStart = now;
    sentThisHour = 0;
  }
  const key = `${where}|${message}`.slice(0, 300);
  if (now - (lastSent.get(key) ?? 0) < SAME_ERROR_PAUSE_MS) return;
  if (sentThisHour >= MAX_PER_HOUR) return;
  lastSent.set(key, now);
  sentThisHour++;

  const lines = [
    "🚨 <b>Ошибка на сайте</b>",
    `Где: <code>${escapeHtml(where.slice(0, 200))}</code>`,
    `Что: ${escapeHtml(message.slice(0, 500))}`,
  ];
  if (digest) lines.push(`Код: <code>${escapeHtml(digest)}</code>`);
  lines.push("", "Подробности — в логах сервера.");
  await sendTelegram(lines.join("\n"));
}
