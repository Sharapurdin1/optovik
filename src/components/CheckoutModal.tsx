"use client";

// Окно оформления заказа: имя, телефон, адрес, оплата, комментарий.
// По кнопке «Отправить заказ» данные уходят на сервер (/api/order),
// оттуда — владельцу в Telegram. Заказ сохраняется в «Мои заказы».
// Имя, телефон и адрес запоминаются на устройстве для следующих заказов.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { useAuth, formatPhone } from "@/lib/auth";
import { formatPhoneInput, isCompletePhone } from "@/lib/phone";
import { PhoneInput } from "./PhoneInput";
import { useOrders, type Order } from "@/lib/orders";
import { formatPrice } from "@/lib/products";
import { loadCheckout, saveCheckout } from "@/lib/checkout-storage";

type PaymentMethod = "Наличными курьеру" | "Картой курьеру";

export function CheckoutModal({
  onClose,
  itemsTotal,
  deliveryFee,
  total,
}: {
  onClose: () => void;
  itemsTotal: number;
  deliveryFee: number;
  total: number;
}) {
  const router = useRouter();
  const { lines, clear } = useCart();
  const { user } = useAuth();
  const { addOrder } = useOrders();

  // Окно монтируется при открытии — сохранённые данные читаем сразу.
  const [saved] = useState(loadCheckout);
  const [name, setName] = useState(saved?.name ?? user?.name ?? "");
  const [phone, setPhone] = useState(() =>
    formatPhoneInput(saved?.phone ?? (user ? formatPhone(user.phone) : ""))
  );
  const [phoneInvalid, setPhoneInvalid] = useState(false);
  // Адрес разбит на отдельные поля — так курьеру понятнее.
  const [street, setStreet] = useState(saved?.street ?? ""); // улица и номер дома
  const [apartment, setApartment] = useState(saved?.apartment ?? "");
  const [entrance, setEntrance] = useState(saved?.entrance ?? ""); // подъезд
  const [floor, setFloor] = useState(saved?.floor ?? "");
  const [intercom, setIntercom] = useState(saved?.intercom ?? ""); // домофон
  const [payment, setPayment] = useState<PaymentMethod>(
    saved?.payment === "Картой курьеру" ? "Картой курьеру" : "Наличными курьеру"
  );
  const [comment, setComment] = useState("");

  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Нажали «Отправить» — подсвечиваем незаполненные обязательные поля
  // (подсветка гаснет, как только поле заполнено).
  const [checkRequired, setCheckRequired] = useState(false);
  const nameMissing = checkRequired && !name.trim();
  const streetMissing = checkRequired && !street.trim();
  const missing = [
    { id: "checkout-name", label: "имя", bad: !name.trim() },
    { id: "checkout-phone", label: "телефон", bad: !isCompletePhone(phone) },
    { id: "checkout-street", label: "адрес", bad: !street.trim() },
  ].filter((f) => f.bad);

  async function handleSubmit() {
    setError(null);
    setCheckRequired(true);

    // Обязательные поля: имя, телефон, адрес. Показываем все ошибки сразу
    // и переводим к первому незаполненному полю.
    if (missing.length > 0) {
      if (!isCompletePhone(phone)) setPhoneInvalid(true);
      const el = document.getElementById(missing[0].id);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
      return;
    }

    // Собираем отдельные поля адреса в одну строку для заказа и Telegram.
    const address = [
      street.trim(),
      apartment.trim() && `кв. ${apartment.trim()}`,
      entrance.trim() && `подъезд ${entrance.trim()}`,
      floor.trim() && `этаж ${floor.trim()}`,
      intercom.trim() && `домофон ${intercom.trim()}`,
    ]
      .filter(Boolean)
      .join(", ");

    const draft = {
      items: lines.map((l) => ({
        productId: l.product.id,
        quantity: l.quantity,
      })),
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        street: street.trim(),
        payment,
        comment: comment.trim(),
      },
    };

    setSending(true);
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => ({ ok: false }));

      if (!res.ok || !data.ok) {
        setError(data.error ?? "Не удалось отправить заказ. Попробуйте ещё раз");
        setSending(false);
        return;
      }

      // Номер, позиции и суммы — как их сохранил сервер (по ценам каталога).
      const order: Order = {
        id: data.id,
        createdAt: new Date().toISOString(),
        items: data.items,
        itemsTotal: data.itemsTotal,
        deliveryFee: data.deliveryFee,
        total: data.total,
        customer: draft.customer,
        status: "Принят",
        key: data.key,
      };

      // Успех: запоминаем данные доставки, сохраняем заказ, чистим корзину.
      saveCheckout({
        name: name.trim(),
        phone: phone.trim(),
        street: street.trim(),
        apartment: apartment.trim(),
        entrance: entrance.trim(),
        floor: floor.trim(),
        intercom: intercom.trim(),
        payment,
      });
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
          Курьер привезёт заказ по указанному адресу. Поля со{" "}
          <span className="text-red-500">*</span> — обязательные.
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="checkout-name" className="block text-sm font-medium text-neutral-700 mb-1">
              Имя<span className="text-red-500"> *</span>
            </label>
            <input
              id="checkout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Как к вам обращаться"
              autoComplete="name"
              aria-required
              aria-invalid={nameMissing}
              className={`w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors ${
                nameMissing ? "!border-red-400 bg-red-50/40" : ""
              }`}
            />
            {nameMissing && <p className="text-xs text-red-500 mt-1">Укажите, как к вам обращаться</p>}
          </div>

          <div>
            <label htmlFor="checkout-phone" className="block text-sm font-medium text-neutral-700 mb-1">
              Телефон<span className="text-red-500"> *</span>
            </label>
            <PhoneInput
              id="checkout-phone"
              value={phone}
              onChange={(v) => {
                setPhone(v);
                setPhoneInvalid(false);
              }}
              invalid={phoneInvalid}
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors tabular-nums"
            />
          </div>

          <div>
            <label htmlFor="checkout-street" className="block text-sm font-medium text-neutral-700 mb-1">
              Адрес доставки<span className="text-red-500"> *</span>
            </label>
            <input
              id="checkout-street"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              maxLength={200}
              placeholder="Улица и дом, например: Гагарина, 15"
              autoComplete="street-address"
              aria-required
              aria-invalid={streetMissing}
              className={`w-full rounded-xl border border-neutral-300 px-4 py-2.5 outline-none focus:border-emerald-500 transition-colors ${
                streetMissing ? "!border-red-400 bg-red-50/40" : ""
              }`}
            />
            {streetMissing && (
              <p className="text-xs text-red-500 mt-1">Укажите улицу и номер дома</p>
            )}
            <div className="grid grid-cols-3 gap-2 mt-2">
              <input
                value={apartment}
                onChange={(e) => setApartment(e.target.value)}
                maxLength={20}
                placeholder="Кв./офис"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                value={entrance}
                onChange={(e) => setEntrance(e.target.value)}
                maxLength={20}
                placeholder="Подъезд"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors"
              />
              <input
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                maxLength={20}
                placeholder="Этаж"
                className="w-full rounded-xl border border-neutral-300 px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <input
              value={intercom}
              onChange={(e) => setIntercom(e.target.value)}
              maxLength={30}
              placeholder="Домофон (если есть)"
              className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 mt-2 outline-none focus:border-emerald-500 transition-colors"
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
              maxLength={1000}
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

        {checkRequired && missing.length > 0 ? (
          <p className="text-sm text-red-500 mt-3">
            Заполните: {missing.map((m) => m.label).join(", ")}
          </p>
        ) : (
          error && <p className="text-sm text-red-500 mt-3">{error}</p>
        )}

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
