// Каталог для АДМИНКИ: чтение со всеми полями и изменения.
// Проверку прав делают вызывающие (страницы и API /api/admin/*).

import "server-only";
import { z } from "zod";
import { and, asc, count, desc, eq, isNotNull, isNull, like, max, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { publicUrl, deleteObjects } from "./s3";
import { loadSheetCatalog, slug } from "./sheet-import";

const { categories, products, productImages, stockMovements } = schema;

// ---------------------------------------------------------------------------
// Проверка входных данных
// ---------------------------------------------------------------------------

// Без .default(): в zod 4 .partial() подставил бы значения по умолчанию,
// и частичное сохранение (например, только «активен») затирало бы поля.
// Значения по умолчанию задаёт база.
const text = (maxLen: number) => z.string().trim().max(maxLen);
const money = z.number().int().min(0).max(10_000_000);

export const CategoryInput = z.object({
  title: text(60).min(1, "Укажите название"),
  emoji: text(16).min(1).optional(),
  active: z.boolean().optional(),
});

export const ProductInput = z.object({
  title: text(120).min(1, "Укажите название"),
  categoryId: z.string().nullable(),
  price: money,
  oldPrice: money.nullable(),
  unit: text(30).min(1, "Укажите единицу (шт, кг, 1 л…)"),
  emoji: text(16).min(1),
  description: text(2000),
  sku: text(60)
    .nullable()
    .transform((v) => v || null),
  hit: z.boolean(),
  active: z.boolean(),
});
export type ProductInputT = z.infer<typeof ProductInput>;

// Понятный текст первой ошибки валидации.
export function firstIssue(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Некорректные данные";
}

// Ошибка уникальности в PostgreSQL (например, повтор артикула).
export function isUniqueViolation(e: unknown): boolean {
  const code = (e as { code?: string; cause?: { code?: string } })?.cause?.code
    ?? (e as { code?: string })?.code;
  return code === "23505";
}

// Свободный id на основе названия: «Молоко» → «молоко», «молоко-2», …
async function uniqueId(
  table: typeof products | typeof categories,
  title: string
): Promise<string> {
  const base = slug(title) || "item";
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(or(eq(table.id, base), like(table.id, `${base}-%`)));
  const taken = new Set(rows.map((r) => r.id));
  if (!taken.has(base)) return base;
  for (let i = 2; ; i++) if (!taken.has(`${base}-${i}`)) return `${base}-${i}`;
}

// ---------------------------------------------------------------------------
// Категории
// ---------------------------------------------------------------------------

export type AdminCategory = typeof categories.$inferSelect & { productCount: number };

export async function listCategoriesAdmin(): Promise<AdminCategory[]> {
  const [cats, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.title)),
    db
      .select({ categoryId: products.categoryId, n: count() })
      .from(products)
      .groupBy(products.categoryId),
  ]);
  const byCat = new Map(counts.map((c) => [c.categoryId, c.n]));
  return cats.map((c) => ({ ...c, productCount: byCat.get(c.id) ?? 0 }));
}

export async function createCategory(input: z.infer<typeof CategoryInput>) {
  const id = await uniqueId(categories, input.title);
  const [{ m }] = await db.select({ m: max(categories.sortOrder) }).from(categories);
  await db.insert(categories).values({ id, ...input, sortOrder: (m ?? 0) + 1 });
  return id;
}

export async function updateCategory(
  id: string,
  input: Partial<z.infer<typeof CategoryInput>>
) {
  await db.update(categories).set(input).where(eq(categories.id, id));
}

export async function deleteCategory(id: string) {
  const [{ n }] = await db
    .select({ n: count() })
    .from(products)
    .where(eq(products.categoryId, id));
  if (n > 0) {
    throw new Error(`В категории ${n} товар(ов) — сначала перенесите их в другую`);
  }
  await db.delete(categories).where(eq(categories.id, id));
}

export async function reorderCategories(ids: string[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx.update(categories).set({ sortOrder: i }).where(eq(categories.id, id));
    }
  });
}

// ---------------------------------------------------------------------------
// Товары
// ---------------------------------------------------------------------------

export type AdminProductRow = typeof products.$inferSelect & {
  categoryTitle: string | null;
  imageUrl: string | null;
};

export async function listProductsAdmin(): Promise<AdminProductRow[]> {
  const [rows, cats, images] = await Promise.all([
    db.select().from(products).orderBy(asc(products.sortOrder), asc(products.title)),
    db.select({ id: categories.id, title: categories.title }).from(categories),
    db
      .select({ productId: productImages.productId, key: productImages.key })
      .from(productImages)
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
  ]);
  const catTitle = new Map(cats.map((c) => [c.id, c.title]));
  const mainImage = new Map<string, string>();
  for (const img of images) {
    if (!mainImage.has(img.productId)) mainImage.set(img.productId, publicUrl(img.key));
  }
  return rows.map((r) => ({
    ...r,
    categoryTitle: r.categoryId ? catTitle.get(r.categoryId) ?? null : null,
    imageUrl: mainImage.get(r.id) ?? null,
  }));
}

export type AdminImage = { id: number; url: string };
export type AdminMovement = Omit<typeof stockMovements.$inferSelect, "createdAt"> & {
  createdAt: string;
};
export type AdminProduct = Omit<typeof products.$inferSelect, "createdAt" | "updatedAt"> & {
  images: AdminImage[];
  movements: AdminMovement[];
};

export async function getProductAdmin(id: string): Promise<AdminProduct | null> {
  const [p] = await db.select().from(products).where(eq(products.id, id));
  if (!p) return null;
  const [images, movements] = await Promise.all([
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder), asc(productImages.id)),
    db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.productId, id))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(50),
  ]);
  return {
    id: p.id,
    title: p.title,
    categoryId: p.categoryId,
    price: p.price,
    oldPrice: p.oldPrice,
    unit: p.unit,
    emoji: p.emoji,
    description: p.description,
    sku: p.sku,
    hit: p.hit,
    active: p.active,
    stock: p.stock,
    sortOrder: p.sortOrder,
    images: images.map((i) => ({ id: i.id, url: publicUrl(i.key) })),
    movements: movements.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
  };
}

export async function createProduct(input: ProductInputT): Promise<string> {
  const id = await uniqueId(products, input.title);
  await db.insert(products).values({ id, ...input });
  return id;
}

export async function updateProduct(id: string, input: Partial<ProductInputT>) {
  await db
    .update(products)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(products.id, id));
}

// Удалить товар вместе с фото (в заказах он останется — названием и ценой).
export async function deleteProduct(id: string) {
  const imgs = await db
    .select({ key: productImages.key })
    .from(productImages)
    .where(eq(productImages.productId, id));
  await db.delete(products).where(eq(products.id, id));
  await deleteObjects(imgs.map((i) => i.key));
}

// ---------------------------------------------------------------------------
// Фото
// ---------------------------------------------------------------------------

export async function addProductImage(productId: string, key: string): Promise<AdminImage> {
  const [{ m }] = await db
    .select({ m: max(productImages.sortOrder) })
    .from(productImages)
    .where(eq(productImages.productId, productId));
  const [row] = await db
    .insert(productImages)
    .values({ productId, key, sortOrder: m === null ? 0 : m + 1 })
    .returning();
  return { id: row.id, url: publicUrl(row.key) };
}

export async function deleteProductImage(productId: string, imageId: number) {
  const [row] = await db
    .delete(productImages)
    .where(and(eq(productImages.id, imageId), eq(productImages.productId, productId)))
    .returning({ key: productImages.key });
  if (row) await deleteObjects([row.key]);
}

export async function reorderProductImages(productId: string, ids: number[]) {
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) {
      await tx
        .update(productImages)
        .set({ sortOrder: i })
        .where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
    }
  });
}

export async function productExists(id: string): Promise<boolean> {
  const [row] = await db.select({ id: products.id }).from(products).where(eq(products.id, id));
  return Boolean(row);
}

// ---------------------------------------------------------------------------
// Склад: обзор
// ---------------------------------------------------------------------------

export type StockRow = { id: string; title: string; unit: string; stock: number; active: boolean };
export type StockMovementRow = AdminMovement & { title: string };

export async function getStockOverview(): Promise<{
  tracked: StockRow[];
  untrackedCount: number;
  movements: StockMovementRow[];
}> {
  const [tracked, [{ n }], movements] = await Promise.all([
    db
      .select({
        id: products.id,
        title: products.title,
        unit: products.unit,
        stock: products.stock,
        active: products.active,
      })
      .from(products)
      .where(isNotNull(products.stock))
      .orderBy(asc(products.stock), asc(products.title)),
    db.select({ n: count() }).from(products).where(isNull(products.stock)),
    db
      .select({ m: stockMovements, title: products.title })
      .from(stockMovements)
      .innerJoin(products, eq(products.id, stockMovements.productId))
      .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id))
      .limit(100),
  ]);
  return {
    tracked: tracked.map((t) => ({ ...t, stock: t.stock ?? 0 })),
    untrackedCount: n,
    movements: movements.map(({ m, title }) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      title,
    })),
  };
}

// ---------------------------------------------------------------------------
// Импорт из Google-таблицы (или стартового списка)
// ---------------------------------------------------------------------------

export async function importCatalog(): Promise<{
  source: "sheet" | "seed";
  categories: number;
  products: number;
  skipped: number;
}> {
  const data = await loadSheetCatalog();
  return db.transaction(async (tx) => {
    const cats = await tx
      .insert(categories)
      .values(data.categories.map((c, i) => ({ ...c, sortOrder: i })))
      .onConflictDoNothing()
      .returning({ id: categories.id });

    // Проверяем, какие категории реально есть — у товара может быть «other».
    const existing = new Set(
      (await tx.select({ id: categories.id }).from(categories)).map((c) => c.id)
    );
    const inserted = await tx
      .insert(products)
      .values(
        data.products.map((p, i) => ({
          id: p.id,
          title: p.title,
          categoryId: existing.has(p.categoryId) ? p.categoryId : null,
          price: p.price,
          oldPrice: p.oldPrice ?? null,
          unit: p.unit,
          emoji: p.emoji,
          hit: Boolean(p.hit),
          sortOrder: i,
          stock: null, // остатки владелец включит сам, где нужно
        }))
      )
      .onConflictDoNothing()
      .returning({ id: products.id });

    return {
      source: data.source,
      categories: cats.length,
      products: inserted.length,
      skipped: data.products.length - inserted.length,
    };
  });
}
