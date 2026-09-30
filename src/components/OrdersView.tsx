"use client";

// Список заказов покупателя. Данные берём из localStorage (useOrders).
// Пока заказ «Принят», его можно отменить; после доставки — оценить.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOrders, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { STATUS_STYLE } from "@/lib/order-status";
import { useSettings } from "@/lib/settings-context";
import { contactLinks } from "@/lib/settings";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function post(url: string, body: unknown) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok && data.ok, ...data } as {
      ok: boolean;
      error?: string;
      status?: string;
      already?: boolean;
    };
  } catch {
    return { ok: false, error: "Нет связи с сервером. Проверьте интернет" };
  }
}

export function OrdersView() {
  const { orders } = useOrders();

  // Подтягиваем актуальные статусы из базы (владелец мог их поменять).
  const [liveStatus, setLiveStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    if (orders.length === 0) return;
    const ids = orders.map((o) => o.id).join(",");
    let cancelled = false;
    fetch(`/api/order/status?ids=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.statuses) setLiveStatus(data.statuses);
      })
      .catch(() => {
        // нет связи — покажем сохранённый статус, ничего страшного
      });
    return () => {
      cancelled = true;
    };
  }, [orders]);

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
        {orders.map((order) => {
          const status = liveStatus[order.id] ?? order.status;
          return (
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
                    STATUS_STYLE[status] ?? "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {status}
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

              <OrderActions
                order={order}
                status={status}
                onStatus={(s) => setLiveStatus((prev) => ({ ...prev, [order.id]: s }))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Что покупатель может сделать с заказом сейчас: отменить, позвонить, оценить.
function OrderActions({
  order,
  status,
  onStatus,
}: {
  order: Order;
  status: string;
  onStatus: (status: string) => void;
}) {
  const { contactPhone } = useSettings();
  const links = contactLinks(contactPhone);

  if (status === "Принят" && order.key) {
    return <CancelButton order={order} onStatus={onStatus} />;
  }
  if (status === "Доставлен" && order.key) {
    return <ReviewBox order={order} />;
  }
  if ((status === "Принят" || status === "Собираем" || status === "В пути") && links) {
    return (
      <p className="text-xs text-neutral-500 mt-3">
        Нужно что-то изменить или отменить?{" "}
        <a href={links.tel} className="text-emerald-600 font-medium hover:underline">
          Позвоните нам
        </a>
      </p>
    );
  }
  return null;
}

function CancelButton({ order, onStatus }: { order: Order; onStatus: (s: string) => void }) {
  const { updateOrder } = useOrders();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    setBusy(true);
    setError(null);
    const r = await post("/api/order/cancel", { id: order.id, key: order.key });
    setBusy(false);
    if (r.status) {
      // Сервер сообщил настоящий статус (в т.ч. если заказ уже начали собирать).
      onStatus(r.status);
      updateOrder(order.id, { status: r.status });
    }
    if (!r.ok) setError(r.error ?? "Не удалось отменить заказ");
    setConfirming(false);
  }

  return (
    <div className="mt-3">
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-700">Отменить заказ?</span>
          <button
            onClick={cancel}
            disabled={busy}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            {busy ? "Отменяем…" : "Да, отменить"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="rounded-xl border border-neutral-300 text-sm px-3 py-1.5 hover:bg-neutral-50 transition-colors"
          >
            Нет
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="text-sm text-red-500 hover:underline"
        >
          Отменить заказ
        </button>
      )}
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
    </div>
  );
}

function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`text-amber-400 ${className}`} aria-label={`${value} из 5`}>
      {"★".repeat(value)}
      <span className="text-neutral-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

// Воронка отзыва: оценка → довольных зовём на карты, недовольным обещаем
// перезвонить (владелец уже получил сообщение с телефоном).
function ReviewBox({ order }: { order: Order }) {
  const { updateOrder } = useOrders();
  const { reviewUrl } = useSettings();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (order.review) {
    return (
      <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-neutral-600">Ваша оценка:</span>
          <Stars value={order.review} />
        </div>
        {order.review >= 4 ? (
          reviewUrl ? (
            <div className="mt-2">
              <p className="text-neutral-600 mb-2">
                Спасибо! Расскажите о нас на картах — так нас найдут соседи.
              </p>
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 transition-colors"
              >
                Оставить отзыв на картах ↗
              </a>
            </div>
          ) : (
            <p className="text-neutral-600 mt-1">Спасибо за отзыв!</p>
          )
        ) : (
          <p className="text-neutral-600 mt-1">
            Спасибо, что рассказали. Мы свяжемся с вами и всё исправим.
          </p>
        )}
      </div>
    );
  }

  async function send() {
    setBusy(true);
    setError(null);
    const r = await post("/api/order/review", { id: order.id, key: order.key, rating, text });
    setBusy(false);
    if (r.ok || r.already) updateOrder(order.id, { review: rating });
    else setError(r.error ?? "Не удалось отправить отзыв");
  }

  return (
    <div className="mt-3 rounded-xl bg-emerald-50 p-3">
      <p className="font-medium text-neutral-800 mb-1">Как вам заказ?</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            aria-label={`Оценка ${n} из 5`}
            className={`text-3xl leading-none transition-colors ${
              n <= rating ? "text-amber-400" : "text-neutral-300 hover:text-amber-300"
            }`}
          >
            ★
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="mt-2 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={2}
            placeholder={
              rating >= 4 ? "Что понравилось? (необязательно)" : "Что пошло не так? Мы разберёмся"
            }
            className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 transition-colors resize-none"
          />
          <p className="text-xs text-neutral-500">
            Отзыв может появиться на сайте: только имя и первая буква фамилии, без телефона.
          </p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={send}
            disabled={busy}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium px-4 py-2 transition-colors disabled:opacity-60"
          >
            {busy ? "Отправляем…" : "Отправить"}
          </button>
        </div>
      )}
    </div>
  );
}
