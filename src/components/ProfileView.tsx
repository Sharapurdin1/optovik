"use client";

import Link from "next/link";
import { useAuth, formatPhone } from "@/lib/auth";
import { useSettings } from "@/lib/settings-context";
import { contactLinks } from "@/lib/settings";
import { clearCheckout, useSavedCheckout } from "@/lib/checkout-storage";

export function ProfileView() {
  const { user, loginEnabled, openLogin, logout } = useAuth();
  const { contactPhone } = useSettings();
  const contact = contactLinks(contactPhone);
  const saved = useSavedCheckout();

  const savedAddress = saved
    ? [
        saved.street,
        saved.apartment && `кв. ${saved.apartment}`,
        saved.entrance && `подъезд ${saved.entrance}`,
        saved.floor && `этаж ${saved.floor}`,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-2xl font-bold mb-4">Профиль</h1>

      {/* Аккаунт — только если вход по телефону работает */}
      {loginEnabled && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
            👤
          </div>
          {user ? (
            <div className="flex-1">
              <div className="font-semibold">{user.name?.trim() || formatPhone(user.phone)}</div>
              <div className="text-sm text-neutral-500">
                {user.name?.trim() ? formatPhone(user.phone) : "Вы вошли в аккаунт"}
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <div className="font-semibold">Вы не вошли</div>
              <button
                onClick={openLogin}
                className="text-sm text-emerald-600 font-medium hover:underline"
              >
                Войти или зарегистрироваться
              </button>
            </div>
          )}
        </div>
      )}

      {/* Данные для доставки, запомненные после прошлого заказа */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold">Данные для доставки</h2>
          {saved && (
            <button
              onClick={clearCheckout}
              className="text-xs text-neutral-400 hover:text-red-500"
            >
              забыть
            </button>
          )}
        </div>
        {saved ? (
          <div className="text-sm text-neutral-600 space-y-0.5">
            <div>👤 {saved.name}</div>
            <div>📞 {saved.phone}</div>
            {savedAddress && <div>📍 {savedAddress}</div>}
            <p className="text-xs text-neutral-400 pt-1">
              Подставятся в следующий заказ — там же их можно изменить.
            </p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">
            После первого заказа имя, телефон и адрес запомнятся на этом устройстве.
          </p>
        )}
      </div>

      {/* Панель владельца — видна только владельцу */}
      {user?.isOwner && (
        <Link
          href="/manage"
          className="flex items-center gap-3 rounded-2xl bg-emerald-500 text-white p-4 mb-4 font-semibold hover:bg-emerald-600 transition-colors"
        >
          <span className="text-xl">🚚</span>
          <span className="flex-1">Панель заказов</span>
          <span>›</span>
        </Link>
      )}

      {/* Меню разделов */}
      <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100 overflow-hidden">
        <Link
          href="/orders"
          className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
        >
          <span className="text-xl">📦</span>
          <span className="flex-1 font-medium">Мои заказы</span>
          <span className="text-neutral-400">›</span>
        </Link>
        {contact && (
          <>
            <a
              href={contact.tel}
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
            >
              <span className="text-xl">📞</span>
              <span className="flex-1 font-medium">Позвонить в магазин</span>
              <span className="text-sm text-neutral-400">{contactPhone}</span>
            </a>
            <a
              href={contact.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
            >
              <span className="text-xl">💬</span>
              <span className="flex-1 font-medium">Написать в WhatsApp</span>
              <span className="text-neutral-400">›</span>
            </a>
          </>
        )}
      </div>

      {user && (
        <button
          onClick={logout}
          className="w-full mt-4 rounded-xl border border-neutral-300 text-red-500 font-medium py-3 hover:bg-red-50 transition-colors"
        >
          Выйти
        </button>
      )}

      <p className="text-center text-xs text-neutral-400 mt-6">
        Оптовик · Доставка продуктов · Махачкала
      </p>
    </div>
  );
}
