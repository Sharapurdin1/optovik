"use client";

// Форма настроек магазина для владельца (/manage/settings).

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Settings } from "@/lib/settings";

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [s, setS] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) {
        setError(data.error ?? "Не удалось сохранить");
        setBusy(false);
        return;
      }
      setSaved(true);
      setBusy(false);
      router.refresh();
    } catch {
      setError("Нет связи с сервером");
      setBusy(false);
    }
  }

  const numField = (
    label: string,
    key: "minOrder" | "deliveryFee" | "freeDeliveryFrom",
    hint?: string
  ) => (
    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-1">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={s[key]}
          onChange={(e) => set(key, Math.max(0, Number(e.target.value) || 0))}
          className="w-32 rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
        />
        <span className="text-neutral-500">₽</span>
      </div>
      {hint && <p className="text-xs text-neutral-400 mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Настройки</h1>
        <Link
          href="/manage"
          className="text-sm rounded-xl border border-neutral-300 px-3 py-1.5 hover:bg-neutral-50 transition-colors"
        >
          ← Заказы
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-5">
        {/* Приём заказов */}
        <label className="flex items-center justify-between cursor-pointer">
          <span className="font-medium">Приём заказов</span>
          <input
            type="checkbox"
            checked={s.acceptingOrders}
            onChange={(e) => set("acceptingOrders", e.target.checked)}
            className="w-5 h-5 accent-emerald-500"
          />
        </label>
        {!s.acceptingOrders && (
          <p className="text-xs text-amber-600 -mt-3">
            Приём выключен — клиенты не смогут оформить заказ.
          </p>
        )}

        {/* Часы работы */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Часы работы
          </label>
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 text-sm">с</span>
            <input
              type="time"
              value={s.workFrom}
              onChange={(e) => set("workFrom", e.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-emerald-500"
            />
            <span className="text-neutral-500 text-sm">до</span>
            <input
              type="time"
              value={s.workTo}
              onChange={(e) => set("workTo", e.target.value)}
              className="rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-emerald-500"
            />
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Вне этих часов заказ оформить нельзя (время махачкалинское).
          </p>
        </div>

        {numField("Минимальный заказ", "minOrder", "0 — без минимума")}
        {numField("Цена доставки", "deliveryFee")}
        {numField(
          "Бесплатная доставка от",
          "freeDeliveryFrom",
          "Если сумма товаров больше — доставка бесплатно."
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Сохранено ✓</p>}

        <button
          onClick={save}
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
        >
          {busy ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
