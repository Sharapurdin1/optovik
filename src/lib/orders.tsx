"use client";

// История заказов покупателя.
// Хранится в localStorage браузера (как корзина) — чтобы человек
// видел свои прошлые заказы в разделе «Мои заказы».
// Сам факт заказа уходит владельцу в Telegram (см. /api/order).

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createLocalStore, useLocalStore } from "./local-store";

export type OrderItem = {
  productId?: string; // id товара из каталога — для пересчёта цены на сервере
  title: string;
  unit: string;
  price: number;
  quantity: number;
};

export type OrderCustomer = {
  name: string;
  phone: string;
  address: string; // полный адрес одной строкой
  street?: string; // «улица и дом» отдельно — для построения маршрута
  payment: string; // «Наличными курьеру» / «Картой курьеру»
  comment: string;
};

export type Order = {
  id: string;
  createdAt: string; // ISO-дата
  items: OrderItem[];
  itemsTotal: number;
  deliveryFee: number;
  total: number;
  customer: OrderCustomer;
  status: string; // «Принят», «Собираем», «В пути», «Доставлен», «Отменён»
  key?: string; // секрет от сервера: с ним можно отменить заказ и оставить отзыв
  review?: number; // оценка, если покупатель уже оставил отзыв
};

type OrdersContextValue = {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (id: string, patch: Partial<Order>) => void;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

const ordersStore = createLocalStore<Order[]>("optovik-orders", []);
const KEEP_ORDERS = 50; // в браузере храним последние 50 заказов

export function OrdersProvider({ children }: { children: ReactNode }) {
  const orders = useLocalStore(ordersStore);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      // Новый заказ показываем сверху.
      addOrder: (order: Order) =>
        ordersStore.set((prev) => [order, ...prev].slice(0, KEEP_ORDERS)),
      updateOrder: (id: string, patch: Partial<Order>) =>
        ordersStore.set((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o))),
    }),
    [orders]
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export function useOrders(): OrdersContextValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders должен вызываться внутри <OrdersProvider>");
  return ctx;
}
