"use client";

// Карточка товара в админке: основные поля, фото (S3) и склад.
// Новый товар сначала сохраняется, потом открываются фото и склад.

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AdminProduct } from "@/lib/catalog-admin";
import { StockBadge } from "./ProductsAdmin";
import { api, btnDanger, btnPrimary, btnSecondary, card, inputCls, labelCls } from "./ui";

type Category = { id: string; title: string };

type Form = {
  title: string;
  categoryId: string;
  price: string;
  oldPrice: string;
  unit: string;
  emoji: string;
  sku: string;
  description: string;
  hit: boolean;
  active: boolean;
};

function toForm(p: AdminProduct | null): Form {
  return {
    title: p?.title ?? "",
    categoryId: p?.categoryId ?? "",
    price: p ? String(p.price) : "",
    oldPrice: p?.oldPrice ? String(p.oldPrice) : "",
    unit: p?.unit ?? "шт",
    emoji: p?.emoji ?? "📦",
    sku: p?.sku ?? "",
    description: p?.description ?? "",
    hit: p?.hit ?? false,
    active: p?.active ?? true,
  };
}

const rub = (v: string) => Math.max(0, Math.floor(Number(v.replace(",", ".")) || 0));

export function ProductEditor({
  product,
  categories,
  uploadsEnabled = false,
}: {
  product: AdminProduct | null;
  categories: Category[];
  uploadsEnabled?: boolean;
}) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => toForm(product));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setF((prev) => ({ ...prev, [k]: v }));
    setMsg(null);
  };

  async function save() {
    if (!f.title.trim()) return setMsg({ ok: false, text: "Укажите название" });
    if (!f.price.trim()) return setMsg({ ok: false, text: "Укажите цену" });
    const oldPrice = f.oldPrice.trim() ? rub(f.oldPrice) : null;
    const body = {
      title: f.title,
      categoryId: f.categoryId || null,
      price: rub(f.price),
      oldPrice: oldPrice && oldPrice > rub(f.price) ? oldPrice : null,
      unit: f.unit,
      emoji: f.emoji.trim() || "📦",
      sku: f.sku,
      description: f.description,
      hit: f.hit,
      active: f.active,
    };
    setSaving(true);
    const r = product
      ? await api(`/api/admin/products/${encodeURIComponent(product.id)}`, "PATCH", body)
      : await api<{ id: string }>("/api/admin/products", "POST", body);
    setSaving(false);
    if (!r.ok) return setMsg({ ok: false, text: r.error ?? "Ошибка" });
    if (!product) {
      router.replace(`/manage/products/${encodeURIComponent((r as { id: string }).id)}`);
      return;
    }
    setMsg({ ok: true, text: "Сохранено ✓" });
    router.refresh();
  }

  async function remove() {
    if (!product) return;
    if (!confirm(`Удалить «${product.title}» навсегда? В старых заказах он останется.`)) return;
    const r = await api(`/api/admin/products/${encodeURIComponent(product.id)}`, "DELETE");
    if (!r.ok) return alert(r.error);
    router.replace("/manage/products");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/manage/products" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Все товары
        </Link>
        {product && <StockBadge stock={product.stock} />}
      </div>
      <h1 className="text-2xl font-bold">{product ? product.title : "Новый товар"}</h1>

      {/* Основное */}
      <section className={`${card} space-y-4`}>
        <div>
          <label className={labelCls}>Название *</label>
          <input value={f.title} onChange={(e) => set("title", e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Цена, ₽ *</label>
            <input
              inputMode="numeric"
              value={f.price}
              onChange={(e) => set("price", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Старая цена, ₽</label>
            <input
              inputMode="numeric"
              value={f.oldPrice}
              onChange={(e) => set("oldPrice", e.target.value)}
              placeholder="для скидки"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Единица *</label>
            <input
              value={f.unit}
              onChange={(e) => set("unit", e.target.value)}
              placeholder="шт, кг, 1 л, 10 шт"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Категория</label>
            <select
              value={f.categoryId}
              onChange={(e) => set("categoryId", e.target.value)}
              className={inputCls}
            >
              <option value="">— без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Эмодзи (если нет фото)</label>
            <input value={f.emoji} onChange={(e) => set("emoji", e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Артикул</label>
            <input value={f.sku} onChange={(e) => set("sku", e.target.value)} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Описание</label>
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="Состав, производитель, срок годности…"
            className={inputCls}
          />
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={f.active}
              onChange={(e) => set("active", e.target.checked)}
              className="w-5 h-5 accent-emerald-500"
            />
            <span>Показывать в магазине</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={f.hit}
              onChange={(e) => set("hit", e.target.checked)}
              className="w-5 h-5 accent-emerald-500"
            />
            <span>🔥 Хит продаж</span>
          </label>
        </div>

        {msg && (
          <p className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-500"}`}>{msg.text}</p>
        )}
        <button onClick={save} disabled={saving} className={`${btnPrimary} w-full`}>
          {saving ? "Сохраняем…" : product ? "Сохранить" : "Создать товар"}
        </button>
      </section>

      {product ? (
        <>
          <ImagesSection product={product} enabled={uploadsEnabled} />
          <StockSection product={product} />
          <section className={card}>
            <button onClick={remove} className={btnDanger}>
              Удалить товар
            </button>
          </section>
        </>
      ) : (
        <p className="text-sm text-neutral-500 text-center">
          Фото и остатки можно будет добавить сразу после создания товара.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Фото
// ---------------------------------------------------------------------------

function ImagesSection({ product, enabled }: { product: AdminProduct; enabled: boolean }) {
  const router = useRouter();
  const base = `/api/admin/products/${encodeURIComponent(product.id)}/images`;
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    const list = Array.from(files);
    const failed: string[] = [];
    // По одному файлу — чтобы не упереться в лимит размера запроса.
    for (const [i, file] of list.entries()) {
      setProgress(`Загружаем ${i + 1} из ${list.length}…`);
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch(base, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) failed.push(`${file.name}: ${data.error ?? res.status}`);
      } catch {
        failed.push(`${file.name}: нет связи`);
      }
    }
    setProgress(null);
    setBusy(false);
    if (failed.length) setError(failed.join("\n"));
    router.refresh();
  }

  async function reorder(ids: number[]) {
    setBusy(true);
    const r = await api(base, "PUT", { ids });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Ошибка");
    router.refresh();
  }

  function move(index: number, dir: -1 | 1) {
    const ids = product.images.map((i) => i.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    reorder(ids);
  }

  async function remove(id: number) {
    if (!confirm("Удалить это фото?")) return;
    setBusy(true);
    const r = await api(`${base}/${id}`, "DELETE");
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Ошибка");
    router.refresh();
  }

  return (
    <section className={`${card} space-y-3`}>
      <h2 className="font-bold text-lg">Фото</h2>
      {!enabled && (
        <p className="text-sm text-amber-600">
          Хранилище фото не настроено на сервере — загрузка недоступна.
        </p>
      )}

      {product.images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {product.images.map((img, i) => (
            <div key={img.id} className="space-y-1">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                <Image src={img.url} alt="" fill sizes="160px" className="object-cover" />
                {i === 0 && (
                  <span className="absolute top-1 left-1 rounded-md bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5">
                    ГЛАВНОЕ
                  </span>
                )}
              </div>
              <div className="flex justify-between gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  className="flex-1 rounded-lg border border-neutral-200 text-sm disabled:opacity-30"
                  aria-label="Левее"
                >
                  ←
                </button>
                <button
                  onClick={() => remove(img.id)}
                  disabled={busy}
                  className="flex-1 rounded-lg border border-red-200 text-red-500 text-sm disabled:opacity-30"
                  aria-label="Удалить"
                >
                  ×
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={busy || i === product.images.length - 1}
                  className="flex-1 rounded-lg border border-neutral-200 text-sm disabled:opacity-30"
                  aria-label="Правее"
                >
                  →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label
        className={`${btnSecondary} inline-flex items-center gap-2 cursor-pointer ${
          !enabled || busy ? "pointer-events-none opacity-50" : ""
        }`}
      >
        📷 {progress ?? "Добавить фото"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={!enabled || busy}
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-neutral-400">
        JPG, PNG или WebP до 10 МБ. Фото автоматически уменьшаются. Первое фото — главное в
        каталоге.
      </p>
      {error && <p className="text-sm text-red-500 whitespace-pre-line">{error}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Склад
// ---------------------------------------------------------------------------

const ACTIONS = [
  { value: "Приход", label: "➕ Приход", hint: "пришёл товар от поставщика" },
  { value: "Списание", label: "➖ Списание", hint: "брак, порча, недостача" },
  { value: "Корректировка", label: "🟰 Точный остаток", hint: "после пересчёта (инвентаризация)" },
] as const;

function StockSection({ product }: { product: AdminProduct }) {
  const router = useRouter();
  const url = `/api/admin/products/${encodeURIComponent(product.id)}/stock`;
  const tracked = product.stock !== null;
  const [action, setAction] = useState<(typeof ACTIONS)[number]["value"]>(
    tracked ? "Приход" : "Корректировка"
  );
  const [qty, setQty] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(a: string, quantity?: number) {
    setError(null);
    setBusy(true);
    const r = await api(url, "POST", { action: a, quantity, comment: comment.trim() || undefined });
    setBusy(false);
    if (!r.ok) return setError(r.error ?? "Ошибка");
    setQty("");
    setComment("");
    router.refresh();
  }

  function apply() {
    const n = Math.floor(Number(qty));
    if (!qty.trim() || !Number.isFinite(n) || n < 0) return setError("Укажите количество");
    submit(action, n);
  }

  return (
    <section className={`${card} space-y-4`}>
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg">Склад</h2>
        {tracked && (
          <button
            onClick={() => {
              if (confirm("Перестать вести остаток? Товар будет всегда «в наличии»."))
                submit("Не вести");
            }}
            disabled={busy}
            className="text-xs text-neutral-400 hover:text-neutral-700"
          >
            не вести остаток
          </button>
        )}
      </div>

      {!tracked ? (
        <div className="space-y-2">
          <p className="text-sm text-neutral-600">
            Сейчас остаток не ведётся: товар всегда «в наличии». Укажите, сколько есть на складе,
            — и магазин начнёт списывать остаток с каждым заказом.
          </p>
          <div className="flex gap-2">
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={`сколько есть, ${product.unit}`}
              className={inputCls}
            />
            <button onClick={apply} disabled={busy} className={`${btnPrimary} shrink-0`}>
              Начать учёт
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold tabular-nums">
            {product.stock}{" "}
            <span className="text-base font-normal text-neutral-500">× {product.unit}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {ACTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => setAction(a.value)}
                className={`rounded-xl px-2 py-2 text-sm font-medium ${
                  action === a.value
                    ? "bg-neutral-800 text-white"
                    : "border border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            {ACTIONS.find((a) => a.value === action)?.hint}
          </p>
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <input
              inputMode="numeric"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder={action === "Корректировка" ? "сколько есть" : "количество"}
              className={inputCls}
            />
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="комментарий (необязательно)"
              className={inputCls}
            />
          </div>
          <button onClick={apply} disabled={busy} className={`${btnPrimary} w-full`}>
            {busy ? "Сохраняем…" : "Провести"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {product.movements.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-neutral-700 mb-2">История</h3>
          <MovementsTable movements={product.movements} />
        </div>
      )}
    </section>
  );
}

export function MovementsTable({
  movements,
}: {
  movements: {
    id: number;
    createdAt: string;
    reason: string;
    delta: number;
    balanceAfter: number;
    orderId: string | null;
    comment: string;
    title?: string;
    productId?: string;
  }[];
}) {
  return (
    <div className="divide-y divide-neutral-100 text-sm">
      {movements.map((m) => (
        <div key={m.id} className="flex items-start justify-between gap-3 py-2">
          <div className="min-w-0">
            {m.title && m.productId && (
              <Link
                href={`/manage/products/${encodeURIComponent(m.productId)}`}
                className="font-medium hover:text-emerald-600 block truncate"
              >
                {m.title}
              </Link>
            )}
            <div className="text-neutral-700">
              {m.reason}
              {m.orderId && (
                <Link href={`/manage/orders/${m.orderId}`} className="text-emerald-600 ml-1">
                  №{m.orderId}
                </Link>
              )}
              {m.comment && <span className="text-neutral-500"> · {m.comment}</span>}
            </div>
            <div className="text-xs text-neutral-400">
              {new Date(m.createdAt).toLocaleString("ru-RU", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="text-right shrink-0 tabular-nums">
            <div className={m.delta > 0 ? "text-emerald-600" : m.delta < 0 ? "text-red-500" : ""}>
              {m.delta > 0 ? `+${m.delta}` : m.delta}
            </div>
            <div className="text-xs text-neutral-400">остаток {m.balanceAfter}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
