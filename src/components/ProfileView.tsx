"use client";

import Link from "next/link";
import { useAuth, formatPhone } from "@/lib/auth";

const menu = [
  { icon: "📦", label: "Мои заказы", href: "/orders" },
  { icon: "💬", label: "Поддержка", href: "#" },
  { icon: "📄", label: "Условия и соглашения", href: "#" },
  { icon: "🔒", label: "Политика конфиденциальности", href: "#" },
  { icon: "ℹ️", label: "О магазине", href: "#" },
];

export function ProfileView() {
  const { user, openLogin, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <h1 className="text-2xl font-bold mb-4">Профиль</h1>

      {/* Карточка пользователя */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 mb-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center text-2xl">
          👤
        </div>
        {user ? (
          <div className="flex-1">
            <div className="font-semibold">
              {user.name?.trim() || formatPhone(user.phone)}
            </div>
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
        {menu.map((item) => (
          <a
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 transition-colors"
          >
            <span className="text-xl">{item.icon}</span>
            <span className="flex-1 font-medium">{item.label}</span>
            <span className="text-neutral-400">›</span>
          </a>
        ))}
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
