"use client";

// Страница на случай сбоя на сервере: без технических подробностей,
// с кнопкой «Попробовать ещё раз». Подробности — в логах сервера (digest).

import Link from "next/link";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <div className="text-6xl mb-4">😕</div>
      <h1 className="text-xl font-bold mb-1">Что-то пошло не так</h1>
      <p className="text-neutral-500 mb-6">
        Мы уже знаем о проблеме. Попробуйте ещё раз через минуту.
      </p>
      <div className="flex justify-center gap-2">
        <button
          onClick={() => retry()}
          className="rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-5 py-3 transition-colors"
        >
          Попробовать ещё раз
        </button>
        <Link
          href="/"
          className="rounded-xl border border-neutral-300 px-5 py-3 font-medium hover:bg-neutral-50 transition-colors"
        >
          На главную
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs text-neutral-400 mt-6">Код ошибки: {error.digest}</p>
      )}
    </div>
  );
}
