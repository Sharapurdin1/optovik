// Смена статуса заказа (для страницы владельца /manage).
// POST { id, status } — обновляет статус в базе.

import {
  getOrderStatuses,
  isOrderStatus,
  updateOrderStatus,
} from "@/lib/orders-server";

// GET /api/order/status?ids=a,b,c — актуальные статусы заказов (для клиента).
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    const statuses = await getOrderStatuses(ids);
    return Response.json({ statuses });
  } catch (e) {
    console.error("Не удалось получить статусы заказов:", e);
    return Response.json({ statuses: {} }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: { id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Некорректные данные" }, { status: 400 });
  }

  const id = body.id?.trim();
  if (!id || !isOrderStatus(body.status)) {
    return Response.json(
      { ok: false, error: "Нужны id и корректный статус" },
      { status: 400 }
    );
  }

  try {
    await updateOrderStatus(id, body.status);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("Не удалось сменить статус заказа:", e);
    return Response.json({ ok: false, error: "Ошибка базы данных" }, { status: 500 });
  }
}
