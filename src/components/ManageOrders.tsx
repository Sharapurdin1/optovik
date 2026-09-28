"use client";

// Интерфейс страницы владельца: список заказов (/manage) или один заказ
// (/manage/orders/:id — сюда ведёт кнопка из Telegram) и смена статуса.
// Список сам обновляется раз в 30 секунд — новые заказы появляются без F5.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/products";
import {
  CANCELLED,
  ORDER_STATUSES,
  STATUS_STYLE,
  type OrderStatus,
} from "@/lib/order-status";
import type { AdminOrder } from "@/lib/orders-server";
import { ConfirmButton } from "./admin/ConfirmButton";

const REFRESH_MS = 30_000;
const NEW_FOR_MS = 15 * 60 * 1000; // «новый» — 15 минут после оформления
const ACTIVE: string[] = ["Принят", "Собираем", "В пути"];

type Filter = "active" | "all" | OrderStatus;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// День по махачкалинскому (московскому) времени — для «Сегодня».
function moscowDay(d: Date): string {
  return d.toLocaleDateString("ru-RU", { timeZone: "Europe/Moscow" });
}

function whatsappLink(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return null;
  const intl = digits.length === 10 ? `7${digits}` : digits.replace(/^8/, "7");
  return `https://wa.me/${intl}`;
}

export function ManageOrders({
  orders,
  single = false,
}: {
  orders: AdminOrder[];
  single?: boolean;
}) {
  const router = useRouter();
  // Статусы, изменённые на экране до ответа сервера (оптимистично).
  const [pending, setPending] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; text: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("active");
  const [now, setNow] = useState(() => Date.now());

  // Автообновление списка, пока вкладка открыта.
  useEffect(() => {
    if (single) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setNow(Date.now());
      }
    }, REFRESH_MS);
    return () => clearInterval(t);
  }, [router, single]);

  const view = useMemo(
    () => orders.map((o) => ({ ...o, status: pending[o.id] ?? o.status })),
    [orders, pending]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const o of view) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [view]);

  const today = useMemo(() => {
    const day = moscowDay(new Date(now));
    const list = view.filter(
      (o) => o.status !== CANCELLED && moscowDay(new Date(o.createdAt)) === day
    );
    return { count: list.length, sum: list.reduce((s, o) => s + o.total, 0) };
  }, [view, now]);

  const visible = single
    ? view
    : view.filter((o) =>
        filter === "all" ? true : filter === "active" ? ACTIVE.includes(o.status) : o.status === filter
      );

  async function changeStatus(id: string, status: OrderStatus) {
    setBusyId(id);
    setError(null);
    setPending((p) => ({ ...p, [id]: status }));
    try {
      const res = await fetch("/api/order/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "");
      router.refresh(); // остатки на складе могли измениться
    } catch (e) {
      setPending((p) => {
        const next = { ...p };
        delete next[id]; // откат
        return next;
      });
      setError({
        id,
        text: (e instanceof Error && e.message) || "Не удалось сменить статус. Попробуйте ещё раз.",
      });
    } finally {
      setBusyId(null);
    }
  }

  const tabs: [Filter, string][] = [
    ["active", `В работе (${ACTIVE.reduce((s, st) => s + (counts[st] ?? 0), 0)})`],
    ...ORDER_STATUSES.map((s) => [s, `${s} (${counts[s] ?? 0})`] as [Filter, string]),
    ["all", `Все (${view.length})`],
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        {single ? (
          <Link href="/manage" className="text-sm text-neutral-500 hover:text-neutral-800">
            ← Все заказы
          </Link>
        ) : (
          <h1 className="text-2xl font-bold">Заказы</h1>
        )}
        <button
          onClick={() => {
            router.refresh();
            setNow(Date.now());
          }}
          className="text-sm rounded-xl border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
        >
          Обновить
        </button>
      </div>

      {!single && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white rounded-2xl border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Заказов сегодня</div>
              <div className="text-2xl font-bold tabular-nums">{today.count}</div>
            </div>
            <div className="bg-white rounded-2xl border border-neutral-200 p-3">
              <div className="text-xs text-neutral-500">Сумма сегодня</div>
              <div className="text-2xl font-bold tabular-nums text-emerald-600">
                {formatPrice(today.sum)}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
            {tabs.map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  filter === k ? "bg-neutral-800 text-white" : "bg-white border border-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {visible.length === 0 ? (
        <div className="flex flex-col items-center text-center text-neutral-500 py-16">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-lg font-bold text-neutral-800 mb-1">
            {orders.length === 0 ? "Заказов пока нет" : "Здесь пусто"}
          </h2>
          <p>
            {orders.length === 0
              ? "Здесь появятся все заказы, оформленные в магазине"
              : "В этом разделе заказов нет"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((order) => {
            const isNew =
              order.status === "Принят" && now - new Date(order.createdAt).getTime() < NEW_FOR_MS;
            const wa = whatsappLink(order.phone);
            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl border p-4 ${
                  isNew ? "border-emerald-400 ring-2 ring-emerald-100" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-2">
                  <Link
                    href={`/manage/orders/${order.id}`}
                    className="text-sm text-neutral-500 hover:text-emerald-600"
                  >
                    {isNew && (
                      <span className="mr-1.5 rounded-md bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 align-middle">
                        НОВЫЙ
                      </span>
                    )}
                    №{order.id} · {formatDate(order.createdAt)}
                  </Link>
                  <span
                    className={`shrink-0 text-xs font-medium rounded-full px-2.5 py-1 ${
                      STATUS_STYLE[order.status] ?? "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Покупатель */}
                <div className="mb-2">
                  <div className="font-semibold">{order.name}</div>
                  <div className="flex gap-3 text-sm">
                    <a
                      href={`tel:${order.phone.replace(/[^\d+]/g, "")}`}
                      className="text-emerald-600 hover:underline"
                    >
                      📞 {order.phone}
                    </a>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:underline"
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                  <div className="text-sm text-neutral-600 mt-0.5">📍 {order.address}</div>
                </div>

                {/* Товары */}
                <div className="space-y-1 mb-3 border-t border-neutral-100 pt-2">
                  {order.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-sm gap-2">
                      <span className="text-neutral-700">
                        {it.title} <span className="text-neutral-400">({it.unit})</span>{" "}
                        <span className="text-neutral-400">× {it.quantity}</span>
                      </span>
                      <span className="tabular-nums text-neutral-600 shrink-0">
                        {formatPrice(it.price * it.quantity)}
                      </span>
                    </div>
                  ))}
                  {order.deliveryFee > 0 && (
                    <div className="flex justify-between text-sm text-neutral-500">
                      <span>Доставка</span>
                      <span className="tabular-nums">{formatPrice(order.deliveryFee)}</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between font-semibold mb-3">
                  <span>Итого · {order.payment}</span>
                  <span className="tabular-nums text-emerald-600">{formatPrice(order.total)}</span>
                </div>

                {order.comment && (
                  <div className="text-sm text-neutral-500 mb-3">💬 {order.comment}</div>
                )}

                {/* Смена статуса */}
                {error?.id === order.id && (
                  <p className="text-sm text-red-500 mb-2">{error.text}</p>
                )}
                <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                  {ORDER_STATUSES.filter((s) => s !== CANCELLED).map((s) => {
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
                  {order.status === CANCELLED ? (
                    <span className="rounded-xl px-3 py-1.5 text-sm font-medium bg-red-500 text-white">
                      {CANCELLED}
                    </span>
                  ) : (
                    <ConfirmButton
                      onConfirm={() => changeStatus(order.id, CANCELLED)}
                      disabled={busyId === order.id}
                      confirmText="Отменить заказ?"
                      className="rounded-xl px-3 py-1.5 text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-60"
                    >
                      Отменить
                    </ConfirmButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
