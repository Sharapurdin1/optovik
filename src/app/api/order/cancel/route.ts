// POST /api/order/cancel { id, key } — покупатель сам отменяет свой заказ.
// Можно, пока заказ «Принят»; как только его начали собирать — только звонком.
// Товары возвращаются на склад, владельцу — сообщение в Telegram.
import { after } from "next/server";
import { orderByCustomerKey } from "@/lib/customer-key";
import { StatusConflictError, updateOrderStatus } from "@/lib/orders-server";
import { CANCELLED } from "@/lib/order-status";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { notifyCustomerCancel } from "@/lib/telegram";

export async function POST(req: Request) {
  const lim = await rateLimit(`cancel:ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec);

  const body = await req.json().catch(() => ({}));
  const order = await orderByCustomerKey(String(body.id ?? ""), String(body.key ?? ""));
  if (!order) {
    return Response.json({ ok: false, error: "Заказ не найден" }, { status: 404 });
  }

  try {
    await updateOrderStatus(order.id, CANCELLED, { onlyFrom: "Принят" });
  } catch (e) {
    if (e instanceof StatusConflictError) {
      return Response.json(
        {
          ok: false,
          status: e.current,
          error:
            e.current === CANCELLED
              ? "Заказ уже отменён"
              : "Заказ уже собирают — отменить его можно только по телефону",
        },
        { status: 409 }
      );
    }
    console.error("Покупатель не смог отменить заказ:", e);
    return Response.json(
      { ok: false, error: "Не удалось отменить заказ. Попробуйте ещё раз" },
      { status: 500 }
    );
  }

  after(() => notifyCustomerCancel(order));
  return Response.json({ ok: true, status: CANCELLED });
}
