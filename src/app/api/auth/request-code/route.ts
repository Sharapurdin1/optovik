// POST /api/auth/request-code { phone } — создаёт и «отправляет» код входа.
import { normalizePhone } from "@/lib/phone";
import { requestLoginCode } from "@/lib/auth-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  if (!phone) {
    return Response.json(
      { ok: false, error: "Введите корректный номер телефона" },
      { status: 400 }
    );
  }
  const result = await requestLoginCode(phone);
  // phone возвращаем в нормализованном виде — им же клиент подтвердит код.
  return Response.json(
    { ...result, phone },
    { status: result.ok ? 200 : 500 }
  );
}
