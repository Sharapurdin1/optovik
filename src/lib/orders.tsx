"use client";

// История заказов покупателя.
// Хранится в localStorage браузера (как корзина) — чтобы человек
// видел свои прошлые заказы в разделе «Мои заказы».
// Сам факт заказа уходит владельцу в Telegram (см. /api/order).

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type OrderItem = {
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
  status: string; // «Принят», «Собираем», «В пути», «Доставлен»
};

type OrdersContextValue = {
  orders: Order[];
  addOrder: (order: Order) => void;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

const STORAGE_KEY = "optovik-orders";

export function OrdersProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);

  // Загружаем сохранённые заказы при первом запуске в браузере.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setOrders(JSON.parse(raw));
    } catch {
      // повреждённые данные — игнорируем
    }
  }, []);

  // Сохраняем при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch {
      // приватный режим и т.п. — не критично
    }
  }, [orders]);

  const value = useMemo<OrdersContextValue>(
    () => ({
      orders,
      // Новый заказ показываем сверху.
      addOrder: (order: Order) => setOrders((prev) => [order, ...prev]),
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
