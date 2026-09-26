// Карточка товара: поля, фото, склад.
import { notFound } from "next/navigation";
import { isAdmin } from "@/lib/admin-auth";
import { getProductAdmin, listCategoriesAdmin } from "@/lib/catalog-admin";
import { s3Configured } from "@/lib/s3";
import { AdminLogin } from "@/components/AdminLogin";
import { ProductEditor } from "@/components/admin/ProductEditor";

export default async function ProductPage({ params }: PageProps<"/manage/products/[id]">) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getProductAdmin(decodeURIComponent(id)),
    listCategoriesAdmin(),
  ]);
  if (!product) notFound();
  return (
    <ProductEditor
      product={product}
      categories={categories.map((c) => ({ id: c.id, title: c.title }))}
      uploadsEnabled={s3Configured()}
    />
  );
}
