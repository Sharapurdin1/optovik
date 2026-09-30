// PATCH /api/admin/reviews/:id { published } — показать отзыв на сайте или скрыть.
import { z } from "zod";
import { setReviewPublished } from "@/lib/reviews";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

const Input = z.object({ published: z.boolean() });

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/reviews/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = Number((await ctx.params).id);
  if (!Number.isSafeInteger(id)) return fail("Отзыв не найден", 404);

  const parsed = Input.safeParse(await readJson(req));
  if (!parsed.success) return fail("Некорректные данные");

  try {
    if (!(await setReviewPublished(id, parsed.data.published))) return fail("Отзыв не найден", 404);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось изменить отзыв", e);
  }
}
