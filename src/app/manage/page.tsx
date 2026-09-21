// Страница ВЛАДЕЛЬЦА: все заказы из базы + смена статуса.
// Клиенты сюда не заходят (в нижнем меню ссылки нет), адрес — /manage.

import { getAllOrders } from "@/lib/orders-server";
import { isAdmin } from "@/lib/admin-auth";
import { ManageOrders } from "@/components/ManageOrders";
import { AdminLogin } from "@/components/AdminLogin";

// Всегда свежие данные из базы (не кэшируем).
export const dynamic = "force-dynamic";

export default async function ManagePage() {
  // Панель только для владельца — без входа показываем форму пароля.
  if (!(await isAdmin())) return <AdminLogin />;
  const orders = await getAllOrders();
  return <ManageOrders initialOrders={orders} />;
}
