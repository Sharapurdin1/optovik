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

  // Антиспам: не жжём СМС-баланс. 5 кодов на номер и 20 на устройство в час.
  const HOUR = 60 * 60 * 1000;
  const byPhone = await rateLimit(`code:phone:${phone}`, 5, HOUR);
  if (!byPhone.allowed) return tooMany(byPhone.retryAfterSec, "запросов кода");
  const byIp = await rateLimit(`code:ip:${clientIp(req)}`, 20, HOUR);
  if (!byIp.allowed) return tooMany(byIp.retryAfterSec, "запросов кода");

  const result = await requestLoginCode(phone);
  // phone возвращаем в нормализованном виде — им же клиент подтвердит код.
  return Response.json(
    { ...result, phone },
    { status: result.ok ? 200 : 500 }
  );
}
