// POST /api/admin/login { password } — вход владельца в панель /manage.
import { adminConfigured, checkPassword, setAdminSession } from "@/lib/admin-auth";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return Response.json(
      { ok: false, error: "Пароль владельца не настроен (ADMIN_PASSWORD)" },
      { status: 503 }
    );
  }

  // Защита от подбора пароля: не больше 10 попыток с устройства за 10 минут.
  const lim = await rateLimit(`admin:ip:${clientIp(req)}`, 10, 10 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec, "попыток входа");

  const body = await req.json().catch(() => ({}));
  if (!checkPassword(String(body.password ?? ""))) {
    return Response.json({ ok: false, error: "Неверный пароль" }, { status: 401 });
  }

  await setAdminSession();
  return Response.json({ ok: true });
}
