// POST /api/admin/import — перенести каталог из Google-таблицы в базу.
// Существующие товары и категории не трогает (добавляет только новые).
import { importCatalog } from "@/lib/catalog-admin";
import { denyUnlessAdmin, fail } from "@/lib/admin-api";

export async function POST() {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;

  try {
    const result = await importCatalog();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("Импорт каталога не удался:", e);
    return fail(e instanceof Error ? e.message : "Импорт не удался", 500);
  }
}
