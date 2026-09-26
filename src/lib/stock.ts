// Склад: изменение остатков с записью в журнал движений.
//
// Все функции работают внутри транзакции (tx) — вместе с заказом или
// правкой в админке. Списание сделано одним UPDATE с условием «хватает ли» —
// два одновременных заказа не смогут продать последний товар дважды.

import "server-only";
import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const STOCK_REASONS = [
  "Приход",
  "Продажа",
  "Списание",
  "Корректировка",
  "Возврат",
] as const;
export type StockReason = (typeof STOCK_REASONS)[number];

export class InsufficientStockError extends Error {
  constructor(
    public productId: string,
    public title: string,
    public available: number
  ) {
    super(`«${title}»: в наличии только ${available}`);
  }
}

type Opts = { orderId?: string; comment?: string };

// Изменить остаток на delta (+приход / −расход). Возвращает новый остаток
// или null, если у товара остаток не ведётся (тогда ничего не меняем).
export async function changeStock(
  tx: Tx,
  productId: string,
  delta: number,
  reason: StockReason,
  opts: Opts = {}
): Promise<number | null> {
  const p = schema.products;
  const [row] = await tx
    .update(p)
    .set({ stock: sql`${p.stock} + ${delta}`, updatedAt: new Date() })
    .where(and(eq(p.id, productId), isNotNull(p.stock), sql`${p.stock} + ${delta} >= 0`))
    .returning({ stock: p.stock });

  if (!row) {
    const [cur] = await tx
      .select({ stock: p.stock, title: p.title })
      .from(p)
      .where(eq(p.id, productId));
    if (!cur) throw new Error("Товар не найден");
    if (cur.stock === null) return null; // остаток не ведётся
    throw new InsufficientStockError(productId, cur.title, cur.stock);
  }

  await tx.insert(schema.stockMovements).values({
    productId,
    delta,
    balanceAfter: row.stock!,
    reason,
    orderId: opts.orderId ?? null,
    comment: opts.comment ?? "",
  });
  return row.stock;
}

// Установить точный остаток (инвентаризация). Если остаток ещё не вёлся —
// начинаем вести с этого значения.
export async function setStock(
  tx: Tx,
  productId: string,
  value: number,
  comment = ""
): Promise<number> {
  const p = schema.products;
  const [cur] = await tx
    .select({ stock: p.stock })
    .from(p)
    .where(eq(p.id, productId))
    .for("update");
  if (!cur) throw new Error("Товар не найден");

  const before = cur.stock ?? 0;
  await tx
    .update(p)
    .set({ stock: value, updatedAt: new Date() })
    .where(eq(p.id, productId));
  await tx.insert(schema.stockMovements).values({
    productId,
    delta: value - before,
    balanceAfter: value,
    reason: "Корректировка",
    comment,
  });
  return value;
}

// Перестать вести остаток (товар всегда «в наличии»). Журнал сохраняется.
export async function disableStock(tx: Tx, productId: string): Promise<void> {
  await tx
    .update(schema.products)
    .set({ stock: null, updatedAt: new Date() })
    .where(eq(schema.products.id, productId));
}
