// POST /api/auth/verify { phone, code } — проверяет код и регистрирует вход.
import { normalizePhone } from "@/lib/phone";
import { verifyLoginCode } from "@/lib/auth-server";

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
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
