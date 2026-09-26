// POST /api/admin/categories — создать категорию.
import { CategoryInput, createCategory, firstIssue } from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const parsed = CategoryInput.safeParse(await readJson(req));
  if (!parsed.success) return fail(firstIssue(parsed.error));

  try {
    const id = await createCategory(parsed.data);
    return Response.json({ ok: true, id });
  } catch (e) {
    return serverError("Не удалось создать категорию", e);
  }
}
