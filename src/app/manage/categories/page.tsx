// Категории товаров в панели владельца.
import { isAdmin } from "@/lib/admin-auth";
import { listCategoriesAdmin } from "@/lib/catalog-admin";
import { AdminLogin } from "@/components/AdminLogin";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";

export default async function CategoriesPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const categories = await listCategoriesAdmin();
  return (
    <CategoriesAdmin
      categories={categories.map((c) => ({
        id: c.id,
        title: c.title,
        emoji: c.emoji,
        active: c.active,
        productCount: c.productCount,
      }))}
    />
  );
}
