// Новый товар. После создания открывается его карточка — там фото и склад.
import { isAdmin } from "@/lib/admin-auth";
import { listCategoriesAdmin } from "@/lib/catalog-admin";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function NewProductPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const categories = await listCategoriesAdmin();
  return <ProductEditor product={null} categories={categories.map((c) => ({ id: c.id, title: c.title }))} />;
}
