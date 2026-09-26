// Склад: что заканчивается и журнал всех движений остатков.
import Link from "next/link";
import { isAdmin } from "@/lib/admin-auth";
import { getStockOverview } from "@/lib/catalog-admin";
import { AdminLogin } from "@/components/AdminLogin";
import { StockBadge } from "@/components/admin/ProductsAdmin";
import { MovementsTable } from "@/components/admin/ProductEditor";
import { card } from "@/components/admin/ui";

export default async function StockPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const { tracked, untrackedCount, movements } = await getStockOverview();

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <h1 className="text-2xl font-bold">Склад</h1>
      <p className="text-sm text-neutral-500">
        Приход, списание и точный остаток — в карточке товара. Продажи списываются сами при
        заказе, отмена заказа возвращает товар.
        {untrackedCount > 0 && ` Без учёта остатка: ${untrackedCount} товар(ов).`}
      </p>

      <section className={card}>
        <h2 className="font-bold text-lg mb-2">Остатки (сначала заканчивающиеся)</h2>
        {tracked.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Ни по одному товару остаток пока не ведётся. Откройте товар и нажмите «Начать учёт».
          </p>
        ) : (
          <div className="divide-y divide-neutral-100">
            {tracked.map((t) => (
              <Link
                key={t.id}
                href={`/manage/products/${encodeURIComponent(t.id)}`}
                className={`flex items-center justify-between gap-3 py-2 hover:text-emerald-600 ${
                  t.active ? "" : "opacity-60"
                }`}
              >
                <span className="truncate">{t.title}</span>
                <StockBadge stock={t.stock} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-bold text-lg mb-2">Последние движения</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-neutral-500">Движений пока не было.</p>
        ) : (
          <MovementsTable movements={movements} />
        )}
      </section>
    </div>
  );
}
