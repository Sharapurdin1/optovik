// POST /api/order/review { id, key, rating, text } — отзыв о доставленном заказе.
// Один отзыв на заказ. Владельцу — сообщение в Telegram (плохая оценка —
// с телефоном покупателя).
import { after } from "next/server";
import { z } from "zod";
import { orderByCustomerKey } from "@/lib/customer-key";
import { addReview } from "@/lib/reviews";
import { rateLimit, clientIp, tooMany } from "@/lib/rate-limit";
import { notifyReview } from "@/lib/telegram";

const ReviewInput = z.object({
  id: z.string().max(32),
  key: z.string().max(64),
  rating: z.number().int().min(1).max(5),
  text: z.string().trim().max(1000).default(""),
});

export async function POST(req: Request) {
  const lim = await rateLimit(`review:ip:${clientIp(req)}`, 20, 60 * 60 * 1000);
  if (!lim.allowed) return tooMany(lim.retryAfterSec);

  const parsed = ReviewInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const long = parsed.error.issues.some((i) => i.code === "too_big" && i.path[0] === "text");
    return Response.json(
      { ok: false, error: long ? "Отзыв длиннее 1000 символов" : "Поставьте оценку от 1 до 5" },
      { status: 400 }
    );
  }
  const { id, key, rating, text } = parsed.data;

  const order = await orderByCustomerKey(id, key);
  if (!order) return Response.json({ ok: false, error: "Заказ не найден" }, { status: 404 });
  if (order.status !== "Доставлен") {
    return Response.json(
      { ok: false, error: "Отзыв можно оставить после доставки" },
      { status: 409 }
    );
  }

  try {
    const added = await addReview({ orderId: id, rating, text, name: order.name });
    if (!added) {
      return Response.json(
        { ok: false, error: "Вы уже оставили отзыв на этот заказ", already: true },
        { status: 409 }
      );
    }
  } catch (e) {
    console.error("Не удалось сохранить отзыв:", e);
    return Response.json(
      { ok: false, error: "Не удалось сохранить отзыв. Попробуйте ещё раз" },
      { status: 500 }
    );
  }

  after(() => notifyReview(order, rating, text));
  return Response.json({ ok: true });
}
