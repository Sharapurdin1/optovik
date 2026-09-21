"use client";

// Экран входа владельца в панель /manage (запрос пароля).

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json().catch(() => ({ ok: false }));
      if (!data.ok) {
        setError(data.error ?? "Неверный пароль");
        setBusy(false);
        return;
      }
      router.refresh(); // теперь страница откроет заказы
    } catch {
      setError("Нет связи с сервером");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔒</div>
        <h1 className="text-2xl font-bold">Панель заказов</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Раздел только для владельца. Введите пароль.
        </p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Пароль"
        autoFocus
        className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
      />
      {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      <button
        onClick={submit}
        disabled={busy}
        className="w-full mt-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold py-3 transition-colors disabled:opacity-60"
      >
        {busy ? "Проверяем…" : "Войти"}
      </button>
    </div>
  );
}
