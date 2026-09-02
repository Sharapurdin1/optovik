import Link from "next/link";

export default function OrdersPage() {
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
