// Список товаров в панели владельца.
import { isAdmin } from "@/lib/admin-auth";
import { listCategoriesAdmin, listProductsAdmin } from "@/lib/catalog-admin";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductsAdmin } from "@/components/admin/ProductsAdmin";

export default async function ProductsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const [products, categories] = await Promise.all([
    listProductsAdmin(),
    listCategoriesAdmin(),
  ]);
  return (
    <ProductsAdmin
      products={products.map((p) => ({
        id: p.id,
        title: p.title,
        categoryId: p.categoryId,
        categoryTitle: p.categoryTitle,
        price: p.price,
        oldPrice: p.oldPrice,
        unit: p.unit,
        emoji: p.emoji,
        imageUrl: p.imageUrl,
        stock: p.stock,
        active: p.active,
        hit: p.hit,
      }))}
      categories={categories.map((c) => ({ id: c.id, title: c.title }))}
    />
  );
}
