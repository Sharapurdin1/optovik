"use client";

// Список товаров: поиск, фильтр по категории, остатки, быстрое вкл/выкл.

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/products";
import { api, btnPrimary, btnSecondary, card, inputCls } from "./ui";

export type ProductRow = {
  id: string;
  title: string;
  categoryId: string | null;
  categoryTitle: string | null;
  price: number;
  oldPrice: number | null;
  unit: string;
  emoji: string;
  imageUrl: string | null;
  stock: number | null;
  active: boolean;
  hit: boolean;
};

const LOW_STOCK = 5;

export function StockBadge({ stock }: { stock: number | null }) {
  if (stock === null) return <span className="text-xs text-neutral-400">остаток не ведётся</span>;
  const cls =
    stock === 0
      ? "bg-red-50 text-red-600"
      : stock <= LOW_STOCK
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700";
  return (
    <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${cls}`}>
      {stock === 0 ? "нет в наличии" : `осталось ${stock}`}
    </span>
  );
}

export function ProductThumb({
  imageUrl,
  emoji,
  size = 48,
}: {
  imageUrl: string | null;
  emoji: string;
  size?: number;
}) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-neutral-100 flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.55 }}
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        emoji
      )}
    </div>
  );
}

export function ProductsAdmin({
  products,
  categories,
}: {
  products: ProductRow[];
  categories: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("");
  const [show, setShow] = useState<"all" | "active" | "hidden" | "out">("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !p.title.toLowerCase().includes(q)) return false;
      if (cat === "none" ? p.categoryId !== null : cat && p.categoryId !== cat) return false;
      if (show === "active" && !p.active) return false;
      if (show === "hidden" && p.active) return false;
      if (show === "out" && p.stock !== 0) return false;
      return true;
    });
  }, [products, query, cat, show]);

  async function toggleActive(p: ProductRow) {
    setBusy(p.id);
    setError(null);
    const r = await api(`/api/admin/products/${encodeURIComponent(p.id)}`, "PATCH", {
      active: !p.active,
    });
    setBusy(null);
    if (!r.ok) return setError(`«${p.title}»: ${r.error}`);
    router.refresh();
  }

  async function runImport() {
    // Без подтверждения: импорт только добавляет новые товары и ничего не меняет.
    setBusy("import");
    setImportMsg(null);
    const r = await api<{ source: string; products: number; categories: number; skipped: number }>(
      "/api/admin/import",
      "POST"
    );
    setBusy(null);
    if (!r.ok) return setImportMsg(`❌ ${r.error}`);
    setImportMsg(
      `✅ ${r.source === "sheet" ? "Из Google-таблицы" : "Из стартового списка"}: ` +
        `добавлено товаров — ${r.products}, категорий — ${r.categories}` +
        (r.skipped ? `, уже были — ${r.skipped}` : "")
    );
    router.refresh();
  }

  const hiddenCount = products.filter((p) => !p.active).length;
  const outCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="text-2xl font-bold">
          Товары <span className="text-neutral-400 font-normal">{products.length}</span>
        </h1>
        <Link href="/manage/products/new" className={btnPrimary}>
          + Добавить
        </Link>
      </div>

      {products.length === 0 ? (
        <div className={`${card} text-center py-12`}>
          <div className="text-5xl mb-3">🛍️</div>
          <h2 className="text-lg font-bold mb-1">Товаров пока нет</h2>
          <p className="text-neutral-500 mb-5">
            Перенесите каталог из Google-таблицы одной кнопкой или добавьте товары вручную.
          </p>
          <button onClick={runImport} disabled={busy === "import"} className={btnPrimary}>
            {busy === "import" ? "Переносим…" : "Импортировать из Google-таблицы"}
          </button>
          {importMsg && <p className="mt-3 text-sm">{importMsg}</p>}
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 mb-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔍 Поиск по названию"
              className={inputCls}
            />
            <select value={cat} onChange={(e) => setCat(e.target.value)} className={`${inputCls} sm:w-56`}>
              <option value="">Все категории</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              <option value="none">Без категории</option>
            </select>
          </div>
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
            {(
              [
                ["all", `Все (${products.length})`],
                ["active", "В продаже"],
                ["hidden", `Скрытые (${hiddenCount})`],
                ["out", `Закончились (${outCount})`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setShow(k)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  show === k ? "bg-neutral-800 text-white" : "bg-white border border-neutral-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          {visible.length === 0 ? (
            <p className="text-center text-neutral-500 py-10">Ничего не найдено</p>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100">
              {visible.map((p) => (
                <div key={p.id} className={`flex items-center gap-3 p-3 ${p.active ? "" : "opacity-60"}`}>
                  <ProductThumb imageUrl={p.imageUrl} emoji={p.emoji} />
                  <Link
                    href={`/manage/products/${encodeURIComponent(p.id)}`}
                    className="flex-1 min-w-0 group"
                  >
                    <div className="font-medium truncate group-hover:text-emerald-600">
                      {p.hit && "🔥 "}
                      {p.title}
                    </div>
                    <div className="text-sm text-neutral-500 truncate">
                      {formatPrice(p.price)}
                      {p.oldPrice ? (
                        <span className="line-through text-neutral-400 ml-1">
                          {formatPrice(p.oldPrice)}
                        </span>
                      ) : null}{" "}
                      · {p.unit} · {p.categoryTitle ?? "без категории"}
                    </div>
                    <div className="mt-0.5">
                      <StockBadge stock={p.stock} />
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleActive(p)}
                    disabled={busy === p.id}
                    title={p.active ? "Скрыть из магазина" : "Показать в магазине"}
                    className={`shrink-0 text-xs rounded-full px-3 py-1.5 font-medium transition-colors disabled:opacity-50 ${
                      p.active
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                    }`}
                  >
                    {p.active ? "В продаже" : "Скрыт"}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 text-center">
            <button onClick={runImport} disabled={busy === "import"} className={btnSecondary}>
              {busy === "import" ? "Переносим…" : "Докачать новые товары из Google-таблицы"}
            </button>
            {importMsg && <p className="mt-2 text-sm">{importMsg}</p>}
          </div>
        </>
      )}
    </div>
  );
}
