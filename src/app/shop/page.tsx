import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";

export const metadata: Metadata = { title: "Магазин продуктов" };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  return <Catalog initialCategory={cat ?? null} />;
}
