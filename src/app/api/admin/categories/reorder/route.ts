// POST /api/admin/categories/reorder { ids: [...] } — новый порядок категорий.
import { z } from "zod";
import { reorderCategories } from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

const Body = z.object({ ids: z.array(z.string()).max(500) });

export async function POST(req: Request) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail("Некорректные данные");

  try {
    await reorderCategories(parsed.data.ids);
    return Response.json({ ok: true });
  } catch (e) {
    return serverError("Не удалось изменить порядок категорий", e);
  }
}
