// POST /api/admin/products/:id/stock — операция со складом:
//   { action: "Приход",        quantity: 10, comment }  — пришёл товар
//   { action: "Списание",      quantity: 2,  comment }  — брак, порча
//   { action: "Корректировка", quantity: 37, comment }  — точный остаток (инвентаризация)
//   { action: "Не вести" }                              — выключить учёт остатка
import { z } from "zod";
import { db } from "@/db";
import { productExists } from "@/lib/catalog-admin";
import { InsufficientStockError, changeStock, disableStock, setStock } from "@/lib/stock";
import { denyUnlessAdmin, fail, readJson, serverError } from "@/lib/admin-api";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["Приход", "Списание"]),
    quantity: z.number().int().min(1, "Количество должно быть больше 0").max(1_000_000),
    comment: z.string().trim().max(300).optional(),
  }),
  z.object({
    action: z.literal("Корректировка"),
    quantity: z.number().int().min(0, "Остаток не может быть отрицательным").max(1_000_000),
    comment: z.string().trim().max(300).optional(),
  }),
  z.object({ action: z.literal("Не вести") }),
]);

export async function POST(req: Request, ctx: RouteContext<"/api/admin/products/[id]/stock">) {
  const denied = await denyUnlessAdmin();
  if (denied) return denied;
  const id = decodeURIComponent((await ctx.params).id); // id бывает кириллицей

  const parsed = Body.safeParse(await readJson(req));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Некорректные данные");
  if (!(await productExists(id))) return fail("Товар не найден", 404);
  const b = parsed.data;

  try {
    const stock = await db.transaction(async (tx) => {
      switch (b.action) {
        case "Не вести":
          await disableStock(tx, id);
          return null;
        case "Корректировка":
          return setStock(tx, id, b.quantity, b.comment);
        case "Приход":
        case "Списание": {
          const delta = b.action === "Приход" ? b.quantity : -b.quantity;
          const next = await changeStock(tx, id, delta, b.action, { comment: b.comment });
          if (next === null) {
            throw new Error("Остаток по этому товару не ведётся — сначала задайте его");
          }
          return next;
        }
      }
    });
    return Response.json({ ok: true, stock });
  } catch (e) {
    if (e instanceof InsufficientStockError) {
      return fail(`Нельзя списать больше, чем есть: в наличии ${e.available}`, 409);
    }
    if (e instanceof Error && e.message.startsWith("Остаток по этому")) return fail(e.message, 409);
    return serverError("Не удалось изменить остаток", e);
  }
}
