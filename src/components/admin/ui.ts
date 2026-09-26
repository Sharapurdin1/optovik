// Общие стили элементов админки (Tailwind-классы), чтобы экраны выглядели одинаково.

export const inputCls =
  "w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-emerald-500 transition-colors";

export const btnPrimary =
  "rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold px-4 py-2.5 transition-colors disabled:opacity-60";

export const btnSecondary =
  "rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm hover:bg-neutral-50 transition-colors disabled:opacity-50";

export const btnDanger =
  "rounded-xl border border-red-200 bg-white px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50";

export const card = "bg-white rounded-2xl border border-neutral-200 p-4";

export const labelCls = "block text-sm font-medium text-neutral-700 mb-1";

// POST/PATCH/… с JSON; возвращает { ok, error, ...данные }.
export async function api<T = Record<string, unknown>>(
  url: string,
  method: string,
  body?: unknown
): Promise<{ ok: boolean; error?: string } & T> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      return { ...data, ok: false, error: data.error ?? `Ошибка (${res.status})` };
    }
    return data;
  } catch {
    return { ok: false, error: "Нет связи с сервером" } as { ok: boolean; error?: string } & T;
  }
}
