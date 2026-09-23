// POST /api/auth/request-code { phone } — создаёт и «отправляет» код входа.
import { normalizePhone } from "@/lib/phone";
import { requestLoginCode } from "@/lib/auth-server";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return Response.json(
      { ok: false, error: "Введите корректный номер телефона" },
      { status: 400 }
    );
  }

  const HOUR = 60 * 60 * 1000;
  const COOLDOWN_SEC = 60;

  // Пауза 60 сек между запросами кода на один номер.
  const cd = await rateLimit(`code:cooldown:${phone}`, 1, COOLDOWN_SEC * 1000);
  if (!cd.allowed) {
    return Response.json(
      {
        ok: false,
        error: `Повторный код можно запросить через ${cd.retryAfterSec} сек.`,
        retryAfterSec: cd.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(cd.retryAfterSec) } }
    );
  }

  // Антиспам: не жжём СМС-баланс.
  const byHour = await rateLimit(`code:phone:${phone}`, 5, HOUR); // 5 в час
  if (!byHour.allowed) return tooMany(byHour.retryAfterSec, "запросов кода");
  const byDay = await rateLimit(`code:phone:day:${phone}`, 10, 24 * HOUR); // 10 в сутки
  if (!byDay.allowed) return tooMany(byDay.retryAfterSec, "запросов кода за сутки");
  const byIp = await rateLimit(`code:ip:${clientIp(req)}`, 20, HOUR); // 20 на устройство/час
  if (!byIp.allowed) return tooMany(byIp.retryAfterSec, "запросов кода");

  const result = await requestLoginCode(phone);
  // phone — в нормализованном виде; cooldownSec — для таймера на кнопке.
  return Response.json(
    { ...result, phone, cooldownSec: COOLDOWN_SEC },
    { status: result.ok ? 200 : 500 }
  );
}
