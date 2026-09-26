// POST /api/admin/products/:id/images — загрузить фото (form-data, поле "file").
// PUT  /api/admin/products/:id/images { ids: [...] } — новый порядок фото
//      (первое — главное).
import { z } from "zod";
import {
  addProductImage,
  productExists,
  reorderProductImages,
} from "@/lib/catalog-admin";
import { MAX_UPLOAD_BYTES, s3Configured, uploadProductImage } from "@/lib/s3";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

export async function POST(req: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  if (!s3Configured()) return fail("Хранилище фото не настроено", 503);
  if (!(await productExists(id))) return fail("Товар не найден", 404);

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("Не выбран файл");
  if (file.size === 0) return fail("Файл пустой");
  if (file.size > MAX_UPLOAD_BYTES) return fail("Фото больше 10 МБ — уменьшите его");

  let key: string;
  try {
    key = await uploadProductImage(Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("Не удалось прочитать")) {
      return fail(e.message);
    }
    return serverError("Не удалось загрузить фото в S3", e);
  }

  try {
    const image = await addProductImage(id, key);
    return Response.json({ ok: true, image });
  } catch (e) {
    return serverError("Не удалось сохранить фото", e);
  }
}

const Order = z.object({ ids: z.array(z.number().int()).max(100) });

export async function PUT(req: Request, ctx: RouteContext<"/api/admin/products/[id]/images">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  const parsed = Order.safeParse(await readJson(req));
  if (!parsed.success) return fail("Некорректные данные");

  try {
    await reorderProductImages(id, parsed.data.ids);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось изменить порядок фото", e);
  }
}
