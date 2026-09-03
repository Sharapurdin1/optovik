"use client";

import { useMemo, useState } from "react";
import { useCatalog } from "@/lib/catalog-context";
import { ProductCard } from "./ProductCard";

export function Catalog({ initialCategory = null }: { initialCategory?: string | null }) {
  const { products, categories, hitProducts } = useCatalog();
  const [activeCategory, setActiveCategory] = useState<string | null>(initialCategory);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = !activeCategory || p.categoryId === activeCategory;
      const matchesQuery = !q || p.title.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query, products]);

  // Блок «Хиты продаж» показываем только на общем экране,
  // когда не выбрана категория и пустой поиск.
  const showHits = activeCategory === null && query.trim() === "";

  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      {/* Поиск */}
      <div className="relative mb-4">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">🔍</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Найти товары"
          className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 pl-10 pr-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
        />
      </div>

      {/* Хиты продаж */}
      {showHits && (
        <section className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold">Хиты продаж</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {hitProducts.map((p) => (
              <div key={p.id} className="w-40 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Категории */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 scrollbar-none">
        <button
          onClick={() => setActiveCategory(null)}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
          }`}
        >
          Всё
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeCategory === c.id
                ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200"
            }`}
          >
            <span className="mr-1">{c.emoji}</span>
            {c.title}
          </button>
        ))}
      </div>

      {/* Сетка товаров */}
      {visible.length === 0 ? (
        <div className="text-center text-neutral-500 py-16">
          Ничего не найдено
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
