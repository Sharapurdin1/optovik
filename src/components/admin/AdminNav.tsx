"use client";

// Меню панели владельца: разделы админки + выход.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/manage", label: "📦 Заказы", exact: true },
  { href: "/manage/products", label: "🛍️ Товары" },
  { href: "/manage/categories", label: "🗂️ Категории" },
  { href: "/manage/stock", label: "📊 Склад" },
  { href: "/manage/settings", label: "⚙️ Настройки" },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (t: (typeof TABS)[number]) =>
    t.exact
      ? pathname === t.href || pathname.startsWith("/manage/orders")
      : pathname.startsWith(t.href);

  return (
    <nav className="mx-auto max-w-5xl px-4 pt-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive(t)
                ? "bg-neutral-800 text-white"
                : "bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <button
          onClick={async () => {
            await fetch("/api/admin/logout", { method: "POST" });
            router.refresh();
          }}
          className="shrink-0 ml-auto rounded-full px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
        >
          Выйти
        </button>
      </div>
    </nav>
  );
}
