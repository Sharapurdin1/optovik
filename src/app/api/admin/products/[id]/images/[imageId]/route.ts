// DELETE /api/admin/products/:id/images/:imageId — удалить фото (и файл в S3).
import { deleteProductImage } from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, serverError } from "@/lib/admin-api";

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/admin/products/[id]/images/[imageId]">
) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const { id: rawId, imageId } = await ctx.params;
  const id = decodeURIComponent(rawId); // id бывает кириллицей
  const imgId = Number(imageId);
  if (!Number.isInteger(imgId)) return fail("Некорректный id фото");

  try {
    await deleteProductImage(id, imgId);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось удалить фото", e);
  }
}
