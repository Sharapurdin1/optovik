// Каталог магазина — из базы данных (ведётся в админке /manage/products).
//
// Покупатель видит только активные товары из активных категорий.
// Товары без категории попадают в «Другое».

import "server-only";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { publicUrl } from "./s3";
import type { Category, Product } from "./products";

export type CatalogData = {
  products: Product[];
  categories: Category[];
  hitProducts: Product[];
};

// Категория для товаров без категории.
export const OTHER_CATEGORY: Category = { id: "other", title: "Другое", emoji: "📦" };

export async function getCatalog(): Promise<CatalogData> {
  try {
    const [cats, rows, images] = await Promise.all([
      db
        .select()
        .from(schema.categories)
        .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.title)),
      db
        .select()
        .from(schema.products)
        .where(eq(schema.products.active, true))
        .orderBy(asc(schema.products.sortOrder), asc(schema.products.title)),
      db
        .select({
          productId: schema.productImages.productId,
          key: schema.productImages.key,
        })
        .from(schema.productImages)
        .orderBy(asc(schema.productImages.sortOrder), asc(schema.productImages.id)),
    ]);

    const imagesByProduct = new Map<string, string[]>();
    for (const img of images) {
      const list = imagesByProduct.get(img.productId) ?? [];
      list.push(publicUrl(img.key));
      imagesByProduct.set(img.productId, list);
    }

    const activeCats = new Set(cats.filter((c) => c.active).map((c) => c.id));
    const hiddenCats = new Set(cats.filter((c) => !c.active).map((c) => c.id));

    const products: Product[] = [];
    for (const r of rows) {
      if (r.categoryId && hiddenCats.has(r.categoryId)) continue;
      const categoryId =
        r.categoryId && activeCats.has(r.categoryId) ? r.categoryId : OTHER_CATEGORY.id;
      products.push({
        id: r.id,
        title: r.title,
        categoryId,
        price: r.price,
        unit: r.unit,
        emoji: r.emoji,
        images: imagesByProduct.get(r.id) ?? [],
        description: r.description,
        stock: r.stock,
        hit: r.hit,
        ...(r.oldPrice && r.oldPrice > r.price ? { oldPrice: r.oldPrice } : {}),
      });
    }

    // Показываем только категории, в которых есть товары.
    const present = new Set(products.map((p) => p.categoryId));
    const categories: Category[] = cats
      .filter((c) => c.active && present.has(c.id))
      .map((c) => ({ id: c.id, title: c.title, emoji: c.emoji }));
    if (present.has(OTHER_CATEGORY.id)) categories.push(OTHER_CATEGORY);

    return { products, categories, hitProducts: products.filter((p) => p.hit) };
  } catch (e) {
    // Сбой базы не должен ронять весь сайт — покажем пустой каталог.
    console.error("Каталог не загрузился:", e);
    return { products: [], categories: [], hitProducts: [] };
  }
}
