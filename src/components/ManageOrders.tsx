"use client";

// Интерфейс страницы владельца /manage: список всех заказов и смена статуса.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/products";
import {
  ORDER_STATUSES,
  STATUS_STYLE,
  type OrderStatus,
} from "@/lib/order-status";
import type { AdminOrder } from "@/lib/orders-server";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ManageOrders({ initialOrders }: { initialOrders: AdminOrder[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeStatus(id: string, status: OrderStatus) {
    const prev = orders;
    setBusyId(id);
    // Оптимистично меняем на экране сразу.
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      const res = await fetch("/api/order/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("status update failed");
    } catch {
      setOrders(prev); // откат
      alert("Не удалось сменить статус. Попробуйте ещё раз.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Заказы</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.refresh()}
            className="text-sm rounded-xl border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
          >
            Обновить
          </button>
          <button
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              router.refresh();
            }}
            className="text-sm rounded-xl border border-neutral-300 px-3 py-1.5 text-red-500 hover:bg-red-50 transition-colors"
          >
            Выйти
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center text-center text-neutral-500 py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-lg font-bold text-neutral-800 mb-1">
            Заказов пока нет
          </h2>
          <p>Здесь появятся все заказы, оформленные в магазине</p>
        </div>
      ) : (
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
                <span
                  className={`text-xs font-medium rounded-full px-2.5 py-1 ${
                    STATUS_STYLE[order.status] ?? "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Покупатель */}
              <div className="mb-2">
                <div className="font-semibold">{order.name}</div>
                <a
                  href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                  className="text-sm text-emerald-600 hover:underline"
                >
                  {order.phone}
                </a>
                <div className="text-sm text-neutral-600 mt-0.5">
                  📍 {order.address}
                </div>
              </div>

              {/* Товары */}
              <div className="space-y-1 mb-3 border-t border-neutral-100 pt-2">
                {order.items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
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

              <div className="flex justify-between font-semibold mb-3">
                <span>Итого · {order.payment}</span>
                <span className="tabular-nums text-emerald-600">
                  {formatPrice(order.total)}
                </span>
              </div>

              {order.comment && (
                <div className="text-sm text-neutral-500 mb-3">
                  💬 {order.comment}
                </div>
              )}

              {/* Смена статуса */}
              <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                {ORDER_STATUSES.map((s) => {
                  const active = order.status === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={busyId === order.id || active}
                      onClick={() => changeStatus(order.id, s)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                        active
                          ? "bg-emerald-500 text-white"
                          : "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
