// sitemap.xml: главная, магазин, категории и все товары в продаже.
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection(); // каталог — из базы, на каждый запрос
  const base = siteUrl();
  const { products, categories } = await getCatalog();
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((c) => ({
      url: `${base}/shop?cat=${encodeURIComponent(c.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${encodeURIComponent(p.id)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.slice(0, 1),
    })),
  ];
}
