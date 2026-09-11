// POST /api/auth/name { phone, name } — сохраняет имя клиента (при регистрации).
import { normalizePhone } from "@/lib/phone";
import { setCustomerName } from "@/lib/auth-server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(String(body.phone ?? ""));
  const name = String(body.name ?? "").trim();
  if (!phone || !name) {
    return Response.json(
      { ok: false, error: "Укажите имя" },
      { status: 400 }
    );
  }
  try {
    await setCustomerName(phone, name);
    return Response.json({ ok: true, name });
  } catch (e) {
    console.error("Не удалось сохранить имя:", e);
    return Response.json({ ok: false, error: "Ошибка базы данных" }, { status: 500 });
  }
}
