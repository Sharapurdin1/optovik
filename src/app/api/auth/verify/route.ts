// POST /api/auth/verify { phone, code } — проверяет код и регистрирует вход.
import { normalizePhone } from "@/lib/phone";
import { verifyLoginCode } from "@/lib/auth-server";
import { setAdminSession } from "@/lib/admin-auth";
import { rateLimit, tooMany } from "@/lib/rate-limit";
import { setSession } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const code = String(body.code ?? "").trim();
  if (!phone || !/^\d{4}$/.test(code)) {
    return Response.json(
      { ok: false, error: "Некорректные данные" },
      { status: 400 }
    );
  }

  // Защита от перебора кода: не больше 20 попыток на номер за 15 минут.
  const lim = await rateLimit(`verify:phone:${phone}`, 20, 15 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec, "попыток");

  const result = await verifyLoginCode(phone, code);

  // Успех — выдаём серверную сессию (подписанную cookie).
  if (result.ok) {
    await setSession(phone);
  }

  // Если вошёл владелец — сразу открываем ему доступ к панели /manage.
  if (result.ok && result.isOwner) {
    await setAdminSession();
  }

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
