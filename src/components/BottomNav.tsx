"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

const tabs = [
  { href: "/", label: "Главная", icon: "🏠" },
  { href: "/shop", label: "Магазин", icon: "🛍" },
  { href: "/cart", label: "Корзина", icon: "🛒" },
  { href: "/orders", label: "Заказы", icon: "📦" },
  { href: "/profile", label: "Профиль", icon: "👤" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { totalCount } = useCart();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-neutral-200">
      <div className="mx-auto max-w-5xl grid grid-cols-5">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? "text-emerald-600" : "text-neutral-500"
              }`}
            >
              <span className="relative text-xl leading-none">
                {tab.icon}
                {tab.href === "/cart" && totalCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold tabular-nums">
                    {totalCount}
                  </span>
                )}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
