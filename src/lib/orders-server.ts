// Работа с заказами на СЕРВЕРЕ (из базы данных).
// Используется страницей владельца /manage и обработчиком смены статуса.

import "server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import type { OrderStatus } from "./order-status";

export { ORDER_STATUSES, isOrderStatus, type OrderStatus } from "./order-status";

export type AdminOrderItem = typeof schema.orderItems.$inferSelect;
// createdAt отдаём ISO-строкой: так её одинаково понимают сервер и браузер.
export type AdminOrder = Omit<typeof schema.orders.$inferSelect, "createdAt"> & {
  createdAt: string;
  items: AdminOrderItem[];
};

// Все заказы (новые сверху) вместе с их позициями.
export async function getAllOrders(): Promise<AdminOrder[]> {
  const orders = await db
    .select()
    .from(schema.orders)
    .orderBy(desc(schema.orders.createdAt));

  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const items = await db
    .select()
    .from(schema.orderItems)
    .where(inArray(schema.orderItems.orderId, ids));

  const byOrder = new Map<string, AdminOrderItem[]>();
  for (const it of items) {
    const arr = byOrder.get(it.orderId) ?? [];
    arr.push(it);
    byOrder.set(it.orderId, arr);
  }

  return orders.map((o) => ({
    ...o,
    createdAt: o.createdAt.toISOString(),
    items: byOrder.get(o.id) ?? [],
  }));
}

// Актуальные статусы для набора заказов (по их id).
// Нужно клиенту для «живого» статуса в разделе «Мои заказы».
export async function getOrderStatuses(
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  const rows = await db
    .select({ id: schema.orders.id, status: schema.orders.status })
    .from(schema.orders)
    .where(inArray(schema.orders.id, ids));
  const out: Record<string, string> = {};
  for (const r of rows) out[r.id] = r.status;
  return out;
}

// Сменить статус заказа.
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<void> {
  await db
    .update(schema.orders)
    .set({ status })
    .where(eq(schema.orders.id, id));
}
