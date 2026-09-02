"use client";

// Окно оформления заказа: имя, телефон, адрес, оплата, комментарий.
// По кнопке «Отправить заказ» данные уходят на сервер (/api/order),
// оттуда — владельцу в Telegram. Заказ сохраняется в «Мои заказы».

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useAuth, formatPhone } from "@/lib/auth";
import { useOrders, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";

type PaymentMethod = "Наличными курьеру" | "Картой курьеру";

export function CheckoutModal({
  open,
  onClose,
  itemsTotal,
  deliveryFee,
  total,
}: {
  open: boolean;
  onClose: () => void;
  itemsTotal: number;
  deliveryFee: number;
  total: number;
}) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState(user ? formatPhone(user.phone) : "");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("Наличными курьеру");
  const [comment, setComment] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit() {
    setError(null);

    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("Заполните имя, телефон и адрес");
      return;
    }

    const order: Order = {
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      items: lines.map((l) => ({
        title: l.product.title,
        unit: l.product.unit,
        price: l.product.price,
        quantity: l.quantity,
      })),
      itemsTotal,
      deliveryFee,
      total,
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        payment,
        comment: comment.trim(),
      },
      status: "Принят",
    };

    setSending(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const data = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось отправить заказ. Попробуйте ещё раз");
        setSending(false);
        return;
      }

      // Успех: сохраняем заказ, чистим корзину, ведём в «Мои заказы».
      addOrder(order);
      clear();
      onClose();
      router.push("/orders");
    } catch {
      setError("Нет связи с сервером. Проверьте интернет");
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={sending ? undefined : onClose} />

      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          disabled={sending}
          className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 text-2xl leading-none disabled:opacity-40"
          aria-label="Закрыть"
        >
          ×
        </button>

        <h2 className="text-xl font-bold mb-1">Оформление заказа</h2>
        <p className="text-sm text-neutral-500 mb-4">
          Курьер привезёт заказ по указанному адресу
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Имя
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Как к вам обращаться"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Телефон
            </label>
            <input
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 (999) 123-45-67"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Адрес доставки
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Улица, дом, квартира, этаж"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Оплата
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(["Наличными курьеру", "Картой курьеру"] as PaymentMethod[]).map(
                (method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPayment(method)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                      payment === method
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                    }`}
                  >
                    {method}
                  </button>
                )
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Комментарий <span className="text-neutral-400">(необязательно)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например: домофон не работает, позвоните"
              rows={2}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Итоговая сумма */}
        <div className="mt-4 rounded-xl bg-neutral-50 p-3 space-y-1.5">
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Товары</span>
            <span className="tabular-nums">{formatPrice(itemsTotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-neutral-500">
            <span>Доставка</span>
            <span className="tabular-nums">
              {deliveryFee === 0 ? "Бесплатно" : formatPrice(deliveryFee)}
            </span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Итого</span>
            <span className="tabular-nums text-emerald-600">{formatPrice(total)}</span>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={sending}
          className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
        >
          {sending ? "Отправляем…" : `Отправить заказ · ${formatPrice(total)}`}
        </button>
      </div>
    </div>
  );
}
