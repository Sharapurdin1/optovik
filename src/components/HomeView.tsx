import Link from "next/link";
import { categories, products, hitProducts } from "@/lib/products";
import { ProductCard } from "./ProductCard";

const sales = products.filter((p) => p.oldPrice && p.oldPrice > p.price);

export function HomeView() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4 space-y-8">
      {/* Баннер */}
      <section className="rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-1">Продукты за 30 минут</h1>
        <p className="text-emerald-50 mb-4">
          Свежие продукты с доставкой на дом · Махачкала
        </p>
        <Link
          href="/shop"
          className="inline-block rounded-xl bg-white text-emerald-700 font-semibold px-5 py-2.5 hover:bg-emerald-50 transition-colors"
        >
          Перейти в магазин
        </Link>
      </section>

      {/* Акции */}
      {sales.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏷️</span>
            <h2 className="text-lg font-bold">Акции</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {sales.map((p) => (
              <div key={p.id} className="w-40 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Категории */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">🗂️</span>
          <h2 className="text-lg font-bold">Категории</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/shop?cat=${c.id}`}
              className="flex items-center gap-3 rounded-2xl bg-white border border-neutral-200 p-4 hover:border-emerald-400 hover:shadow-sm transition-all"
            >
              <span className="text-3xl">{c.emoji}</span>
              <span className="font-medium">{c.title}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Хиты продаж */}
      {hitProducts.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🔥</span>
            <h2 className="text-lg font-bold">Хиты продаж</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {hitProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
