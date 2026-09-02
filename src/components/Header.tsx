"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth, formatPhone } from "@/lib/auth";

export function Header() {
  const { user, openLogin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-neutral-200">
      <div className="mx-auto max-w-5xl px-4 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🛒</span>
          <div className="leading-tight">
            <div className="font-bold text-lg flex items-center">
              Опт
              <Image
                src="/ruble.png"
                alt="о"
                width={500}
                height={500}
                style={{ filter: "contrast(1.15) saturate(1.05)" }}
                className="inline-block rounded-full object-cover align-middle mx-[0.06em] h-[1.25em] w-[1.25em] ring-1 ring-neutral-300 shadow-sm"
              />
              вик
            </div>
            <div className="text-xs text-neutral-500">Доставка продуктов · Махачкала</div>
          </div>
        </Link>

        {user ? (
          <button
            onClick={logout}
            title="Нажмите, чтобы выйти"
            className="flex items-center gap-1.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 px-3 py-2 font-medium transition-colors"
          >
            <span>👤</span>
            <span className="hidden sm:inline text-sm">{formatPhone(user.phone)}</span>
          </button>
        ) : (
          <button
            onClick={openLogin}
            className="flex items-center gap-1.5 rounded-xl border border-neutral-300 hover:bg-neutral-100 px-4 py-2 font-medium transition-colors"
          >
            <span>👤</span>
            <span>Войти</span>
          </button>
        )}
      </div>
    </header>
  );
}
