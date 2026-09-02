"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";

const FREE_DELIVERY_FROM = 2000; // бесплатная доставка от суммы, ₽
const DELIVERY_FEE = 200; // стоимость доставки, ₽

export function CartView() {
  const { lines, totalPrice, totalCount, add, remove, clear } = useCart();

  const deliveryFee =
    totalPrice >= FREE_DELIVERY_FROM || totalPrice === 0 ? 0 : DELIVERY_FEE;
  const grandTotal = totalPrice + deliveryFee;
  const untilFree = Math.max(0, FREE_DELIVERY_FROM - totalPrice);

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 flex flex-col items-center text-center text-neutral-500">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-xl font-bold text-neutral-800 mb-1">Корзина пуста</h1>
        <p className="mb-6">Добавьте товары из магазина</p>
        <Link
          href="/shop"
          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 transition-colors"
        >
          Перейти в магазин
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-2xl font-bold mb-4">Корзина</h1>

      <div className="space-y-3 mb-6">
        {lines.map(({ product, quantity }) => (
          <div
            key={product.id}
            className="flex items-center gap-3 bg-white rounded-2xl border border-neutral-200 p-3"
          >
            <div className="text-3xl w-12 h-12 flex items-center justify-center rounded-lg bg-neutral-100 shrink-0">
              {product.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{product.title}</div>
              <div className="text-sm text-neutral-500">
                {formatPrice(product.price)} · {product.unit}
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200">
              <button
                onClick={() => remove(product.id)}
                className="px-3 py-1 text-lg leading-none"
                aria-label="Убрать один"
              >
                −
              </button>
              <span className="tabular-nums w-5 text-center">{quantity}</span>
              <button
                onClick={() => add(product.id)}
                className="px-3 py-1 text-lg leading-none"
                aria-label="Добавить один"
              >
                +
              </button>
            </div>
            <div className="w-20 text-right font-semibold tabular-nums shrink-0">
              {formatPrice(product.price * quantity)}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={clear}
        className="text-sm text-neutral-500 hover:text-red-500 transition-colors mb-6"
      >
        Очистить корзину
      </button>

      <div className="bg-white rounded-2xl border border-neutral-200 p-4 space-y-3">
        {untilFree > 0 && (
          <div className="text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 py-2">
            До бесплатной доставки: {formatPrice(untilFree)}
          </div>
        )}
        <div className="flex justify-between text-sm text-neutral-500">
          <span>Товары ({totalCount})</span>
          <span className="tabular-nums">{formatPrice(totalPrice)}</span>
        </div>
        <div className="flex justify-between text-sm text-neutral-500">
          <span>Доставка</span>
          <span className="tabular-nums">
            {deliveryFee === 0 ? "Бесплатно" : formatPrice(deliveryFee)}
          </span>
        </div>
        <div className="flex justify-between text-lg font-bold">
          <span>Итого</span>
          <span className="tabular-nums text-emerald-600">{formatPrice(grandTotal)}</span>
        </div>
        <button className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors">
          Оформить заказ
        </button>
      </div>
    </div>
  );
}
