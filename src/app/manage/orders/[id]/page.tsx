// Один заказ в панели владельца. Сюда ведёт кнопка из уведомления в Telegram.
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders-server";
import { isAdmin } from "@/lib/admin-auth";
import { ManageOrders } from "@/components/ManageOrders";
import { AdminLogin } from "@/components/AdminLogin";

export default async function OrderPage({ params }: PageProps<"/manage/orders/[id]">) {
  if (!(await isAdmin())) return <AdminLogin />;
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  return <ManageOrders initialOrders={[order]} single />;
}
