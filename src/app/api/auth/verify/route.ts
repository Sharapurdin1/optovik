// POST /api/auth/verify { phone, code } — проверяет код и регистрирует вход.
import { cookies } from "next/headers";
import { normalizePhone } from "@/lib/phone";
import { verifyLoginCode } from "@/lib/auth-server";
import { ADMIN_COOKIE, sessionToken } from "@/lib/admin-auth";

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
  const result = await verifyLoginCode(phone, code);

  // Если вошёл владелец — сразу открываем ему доступ к панели /manage.
  if (result.ok && result.isOwner) {
    const token = sessionToken();
    if (token) {
      (await cookies()).set(ADMIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
  }

  return Response.json(result, { status: result.ok ? 200 : 400 });
}
