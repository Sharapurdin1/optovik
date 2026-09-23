"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { calcDeliveryFee, isOpenNow } from "@/lib/settings";
import { useSettings } from "@/lib/settings-context";
import { CheckoutModal } from "./CheckoutModal";

export function CartView() {
  const { lines, totalPrice, totalCount, add, remove, clear } = useCart();
  const settings = useSettings();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const deliveryFee = calcDeliveryFee(totalPrice, settings);
  const grandTotal = totalPrice + deliveryFee;
  const untilFree = Math.max(0, settings.freeDeliveryFrom - totalPrice);

  // Правила из настроек магазина.
  const open = isOpenNow(settings);
  const belowMin = settings.minOrder > 0 && totalPrice < settings.minOrder;
  const needMore = settings.minOrder - totalPrice;
  const canCheckout = open && !belowMin;

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
        {!open && (
          <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            {settings.acceptingOrders
              ? `Сейчас закрыто. Приём заказов с ${settings.workFrom} до ${settings.workTo}.`
              : "Приём заказов временно приостановлен."}
          </div>
        )}
        {open && belowMin && (
          <div className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Минимальный заказ {formatPrice(settings.minOrder)}. Добавьте ещё на{" "}
            {formatPrice(needMore)}.
          </div>
        )}
        <button
          onClick={() => setCheckoutOpen(true)}
          disabled={!canCheckout}
          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Оформить заказ
        </button>
      </div>

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        itemsTotal={totalPrice}
        deliveryFee={deliveryFee}
        total={grandTotal}
      />
    </div>
  );
}
