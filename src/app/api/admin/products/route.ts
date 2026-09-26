// POST /api/admin/products — создать товар. Возвращает его id.
import {
  ProductInput,
  createProduct,
  firstIssue,
  isUniqueViolation,
} from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const parsed = ProductInput.safeParse(await readJson(req));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    const id = await createProduct(parsed.data);
    return Response.json({ ok: true, id });
  } catch (e) {
    if (isUniqueViolation(e)) return fail("Товар с таким артикулом уже есть", 409);
    return serverError("Не удалось создать товар", e);
  }
}
