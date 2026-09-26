// PATCH  /api/admin/products/:id — изменить поля товара (можно частично).
// DELETE /api/admin/products/:id — удалить товар вместе с фото.
import {
  ProductInput,
  deleteProduct,
  firstIssue,
  isUniqueViolation,
  productExists,
  updateProduct,
} from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  const parsed = ProductInput.partial().safeParse(await readJson(req));
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (!(await productExists(id))) return fail("Товар не найден", 404);

  try {
    await updateProduct(id, parsed.data);
    return Response.json({ ok: true });
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Товар с таким артикулом уже есть", 409);
    return serverError("Не удалось сохранить товар", e);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  try {
    await deleteProduct(id);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось удалить товар", e);
  }
}
