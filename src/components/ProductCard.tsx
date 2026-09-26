"use client";

import Image from "next/image";
import { useCart } from "@/lib/cart";
import { formatPrice, inStock, type Product } from "@/lib/products";

export function ProductCard({ product }: { product: Product }) {
  const { quantityOf, add, remove } = useCart();
  const qty = quantityOf(product.id);
  const available = inStock(product);
  // Больше, чем есть на складе, положить нельзя.
  const canAddMore = product.stock === null || qty < product.stock;

  const discount =
    product.oldPrice && product.oldPrice > product.price
      ? Math.round((1 - product.price / product.oldPrice) * 100)
      : 0;

  return (
    <div className="flex flex-col rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-3 shadow-sm">
      <div className="relative flex items-center justify-center text-5xl h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 mb-3 select-none overflow-hidden">
        {product.images[0] ? (
          <Image
            src={product.images[0]}
            alt={product.title}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
            className={`object-cover ${available ? "" : "grayscale opacity-60"}`}
          />
        ) : (
          <span className={available ? "" : "grayscale opacity-60"}>{product.emoji}</span>
        )}
        {discount > 0 && (
          <span className="absolute top-1.5 left-1.5 rounded-md bg-red-500 text-white text-xs font-bold px-1.5 py-0.5">
            −{discount}%
          </span>
        )}
      </div>

      <div className="flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-emerald-600 leading-tight">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="text-xs text-neutral-400 line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        <div className="text-sm text-neutral-800 dark:text-neutral-200 leading-tight mt-0.5">
          {product.title}
        </div>
        <div className="text-xs text-neutral-500 mt-0.5">{product.unit}</div>
      </div>

      <div className="mt-3">
        {!available ? (
          <div className="w-full rounded-xl bg-neutral-100 text-neutral-500 text-center font-medium py-2">
            Нет в наличии
          </div>
        ) : qty === 0 ? (
          <button
            onClick={() => add(product.id)}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-medium py-2 transition-colors"
          >
            В корзину
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-xl bg-emerald-500 text-white font-medium overflow-hidden">
            <button
              onClick={() => remove(product.id)}
              className="px-4 py-2 text-xl leading-none hover:bg-emerald-600 active:bg-emerald-700 transition-colors"
              aria-label="Убрать один"
            >
              −
            </button>
            <span className="tabular-nums">{qty}</span>
            <button
              onClick={() => add(product.id)}
              disabled={!canAddMore}
              className="px-4 py-2 text-xl leading-none hover:bg-emerald-600 active:bg-emerald-700 transition-colors disabled:opacity-40"
              aria-label="Добавить один"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
