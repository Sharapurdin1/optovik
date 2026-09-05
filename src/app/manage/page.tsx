// Страница ВЛАДЕЛЬЦА: все заказы из базы + смена статуса.
// Клиенты сюда не заходят (в нижнем меню ссылки нет), адрес — /manage.

import { getAllOrders } from "@/lib/orders-server";
import { ManageOrders } from "@/components/ManageOrders";

// Всегда свежие данные из базы (не кэшируем).
export const dynamic = "force-dynamic";

export default async function ManagePage() {
  const orders = await getAllOrders();
  return <ManageOrders initialOrders={orders} />;
}
