// POST /api/auth/name { name } — сохраняет имя ТЕКУЩЕГО вошедшего клиента.
// Номер берётся из серверной сессии, а не из тела запроса — чужому номеру
// имя задать нельзя.
import { setCustomerName } from "@/lib/auth-server";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json(
      { ok: false, error: "Сначала войдите" },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (!name) {
    return Response.json({ ok: false, error: "Укажите имя" }, { status: 400 });
  }

  try {
    await setCustomerName(session.phone, name);
    return Response.json({ ok: true, name });
  } catch (e) {
    console.error("Не удалось сохранить имя:", e);
    return Response.json({ ok: false, error: "Ошибка базы данных" }, { status: 500 });
  }
}
