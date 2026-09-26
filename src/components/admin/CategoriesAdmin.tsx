"use client";

// Категории: добавить, переименовать, скрыть, поменять порядок, удалить пустую.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, btnPrimary, card, inputCls } from "./ui";

type Cat = { id: string; title: string; emoji: string; active: boolean; productCount: number };

export function CategoriesAdmin({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");

  async function run(p: Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const r = await p;
    setBusy(false);
    if (!r.ok) {
      setError(r.error ?? "Ошибка");
      return false;
    }
    router.refresh();
    return true;
  }

  const patch = (id: string, body: Partial<Cat>) =>
    run(api(`/api/admin/categories/${encodeURIComponent(id)}`, "PATCH", body));

  function move(index: number, dir: -1 | 1) {
    const ids = categories.map((c) => c.id);
    const j = index + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(api("/api/admin/categories/reorder", "POST", { ids }));
  }

  async function add() {
    if (!newTitle.trim()) return setError("Укажите название категории");
    const ok = await run(
      api("/api/admin/categories", "POST", { title: newTitle, emoji: newEmoji.trim() || "📦" })
    );
    if (ok) {
      setNewTitle("");
      setNewEmoji("📦");
    }
  }

  function remove(c: Cat) {
    if (!confirm(`Удалить категорию «${c.title}»?`)) return;
    run(api(`/api/admin/categories/${encodeURIComponent(c.id)}`, "DELETE"));
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
      <h1 className="text-2xl font-bold">Категории</h1>
      <p className="text-sm text-neutral-500">
        Порядок здесь = порядок в магазине. Скрытая категория прячет и все свои товары.
        Название и эмодзи сохраняются, когда уводите курсор с поля.
      </p>

      {categories.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200 divide-y divide-neutral-100">
          {categories.map((c, i) => (
            <div key={c.id} className={`flex items-center gap-2 p-3 ${c.active ? "" : "opacity-60"}`}>
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={busy || i === 0}
                  className="text-xs leading-none px-1 disabled:opacity-20"
                  aria-label="Выше"
                >
                  ▲
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={busy || i === categories.length - 1}
                  className="text-xs leading-none px-1 disabled:opacity-20"
                  aria-label="Ниже"
                >
                  ▼
                </button>
              </div>
              <input
                defaultValue={c.emoji}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.emoji) patch(c.id, { emoji: v });
                }}
                className="w-12 text-center rounded-lg border border-neutral-200 py-1.5 text-xl"
              />
              <input
                defaultValue={c.title}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== c.title) patch(c.id, { title: v });
                }}
                className="flex-1 min-w-0 rounded-lg border border-neutral-200 px-2 py-1.5"
              />
              <span className="text-xs text-neutral-400 shrink-0 w-14 text-right">
                {c.productCount} тов.
              </span>
              <button
                onClick={() => patch(c.id, { active: !c.active })}
                disabled={busy}
                className={`shrink-0 text-xs rounded-full px-2.5 py-1 ${
                  c.active ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                }`}
              >
                {c.active ? "видна" : "скрыта"}
              </button>
              <button
                onClick={() => remove(c)}
                disabled={busy || c.productCount > 0}
                title={c.productCount > 0 ? "Сначала перенесите товары" : "Удалить"}
                className="shrink-0 text-red-500 px-1 disabled:opacity-20"
                aria-label="Удалить"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={`${card} space-y-2`}>
        <h2 className="font-semibold">Новая категория</h2>
        <div className="flex gap-2">
          <input
            value={newEmoji}
            onChange={(e) => setNewEmoji(e.target.value)}
            className="w-14 text-center rounded-xl border border-neutral-300 text-xl"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            placeholder="Например: Замороженные продукты"
            className={inputCls}
          />
          <button onClick={add} disabled={busy} className={`${btnPrimary} shrink-0`}>
            Добавить
          </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
