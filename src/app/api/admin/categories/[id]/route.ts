// PATCH  /api/admin/categories/:id — изменить (название, эмодзи, вкл/выкл).
// DELETE /api/admin/categories/:id — удалить пустую категорию.
import {
  CategoryInput,
  deleteCategory,
  firstIssue,
  updateCategory,
} from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  const parsed = CategoryInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    await updateCategory(id, parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось изменить категорию", e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/categories/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  try {
    await deleteCategory(id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("В категории")) return fail(e.message, 409);
    return serverError("Не удалось удалить категорию", e);
  }
}
