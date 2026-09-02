import { Catalog } from "@/components/Catalog";

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  return <Catalog initialCategory={cat ?? null} />;
}
