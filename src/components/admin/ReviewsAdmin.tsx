"use client";

// Отзывы в админке. Плохие оценки — с телефоном, чтобы перезвонить.
// Кнопка «Показать на сайте» выводит отзыв на главную (имя — сокращённое).

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminReview } from "@/lib/reviews";
import { api, btnSecondary, card } from "./ui";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-amber-400 text-lg leading-none" aria-label={`${value} из 5`}>
      {"★".repeat(value)}
      <span className="text-neutral-300">{"★".repeat(5 - value)}</span>
    </span>
  );
}

export function ReviewsAdmin({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const count = reviews.length;
  const avg = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  const bad = reviews.filter((r) => r.rating <= 3).length;

  async function toggle(r: AdminReview) {
    setBusyId(r.id);
    setError(null);
    const res = await api(`/api/admin/reviews/${r.id}`, "PATCH", { published: !r.published });
    setBusyId(null);
    if (!res.ok) setError(res.error ?? "Ошибка");
    else router.refresh();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <h1 className="text-2xl font-bold">Отзывы</h1>

      <section className={`${card} flex flex-wrap gap-6`}>
        <div>
          <div className="text-sm text-neutral-500">Средняя оценка</div>
          <div className="text-2xl font-bold tabular-nums">
            {count ? avg.toFixed(1).replace(".", ",") : "—"}
            <span className="text-amber-400"> ★</span>
          </div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Всего отзывов</div>
          <div className="text-2xl font-bold tabular-nums">{count}</div>
        </div>
        <div>
          <div className="text-sm text-neutral-500">Оценки 1–3</div>
          <div className={`text-2xl font-bold tabular-nums ${bad ? "text-red-500" : ""}`}>{bad}</div>
        </div>
      </section>

      <p className="text-sm text-neutral-500">
        Покупатель может оценить заказ в «Моих заказах» после статуса «Доставлен». О каждом
        отзыве приходит сообщение в Telegram. Довольных (4–5 ★) сайт зовёт оставить отзыв на
        картах — ссылка в «Настройках».
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {count === 0 ? (
        <p className={`${card} text-sm text-neutral-500`}>Отзывов пока нет.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className={`${card} ${r.rating <= 3 ? "border-red-200 bg-red-50/40" : ""}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Stars value={r.rating} />
                <span className="text-xs text-neutral-400">{formatDate(r.createdAt)}</span>
              </div>
              {r.text ? (
                <p className="mt-2 whitespace-pre-line text-neutral-800">{r.text}</p>
              ) : (
                <p className="mt-2 text-sm text-neutral-400">Без комментария</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
                <span>👤 {r.name}</span>
                {r.phone && (
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="hover:text-emerald-600">
                    📞 {r.phone}
                  </a>
                )}
                <Link
                  href={`/manage/orders/${encodeURIComponent(r.orderId)}`}
                  className="hover:text-emerald-600"
                >
                  Заказ №{r.orderId}
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => toggle(r)}
                  disabled={busyId === r.id}
                  className={btnSecondary}
                >
                  {r.published ? "Скрыть с сайта" : "Показать на сайте"}
                </button>
                {r.published && <span className="text-xs text-emerald-600">✓ на главной</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
