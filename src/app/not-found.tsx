// Страница «не найдено» (удалённый товар, опечатка в адресе).
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-xl font-bold mb-1">Такой страницы нет</h1>
      <p className="text-neutral-500 mb-6">
        Возможно, товар закончился или ссылка устарела.
      </p>
      <Link
        href="/shop"
        className="inline-block rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 transition-colors"
      >
        Перейти в магазин
      </Link>
    </div>
  );
}
