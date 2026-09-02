"use client";

// Список заказов покупателя. Данные берём из localStorage (useOrders).

import Link from "next/link";
import { useOrders } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function OrdersView() {
  const { orders } = useOrders();

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-4">
        <h1 className="text-2xl font-bold mb-4">Мои заказы</h1>
        <div className="flex flex-col items-center text-center text-neutral-500 py-16">
          <div className="text-6xl mb-4">📦</div>
          <h2 className="text-lg font-bold text-neutral-800 mb-1">Заказов пока нет</h2>
          <p className="mb-6">Здесь появятся ваши заказы после оформления</p>
          <Link
            href="/shop"
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 transition-colors"
          >
            Перейти в магазин
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-2xl font-bold mb-4">Мои заказы</h1>

      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-2xl border border-neutral-200 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-neutral-500">
                {formatDate(order.createdAt)}
              </span>
              <span className="text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-1">
                {order.status}
              </span>
            </div>

            <div className="space-y-1 mb-3">
              {order.items.map((it, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-neutral-700">
                    {it.title}{" "}
                    <span className="text-neutral-400">× {it.quantity}</span>
                  </span>
                  <span className="tabular-nums text-neutral-600">
                    {formatPrice(it.price * it.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between border-t border-neutral-100 pt-2 font-semibold">
              <span>Итого</span>
              <span className="tabular-nums text-emerald-600">
                {formatPrice(order.total)}
              </span>
            </div>

            <div className="text-xs text-neutral-400 mt-2">
              {order.customer.address} · {order.customer.payment}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
