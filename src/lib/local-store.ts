"use client";

// Состояние, которое живёт в localStorage браузера (корзина, «Мои заказы»,
// вход). Подключается к React через useSyncExternalStore: без useEffect
// и лишней перерисовки, на сервере — значение по умолчанию, а изменения
// в другой вкладке подхватываются сами.

import { useSyncExternalStore } from "react";

export type LocalStore<T> = {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
  getServer: () => T;
};

export function createLocalStore<T>(key: string, fallback: T): LocalStore<T> {
  const listeners = new Set<() => void>();
  // Если localStorage недоступен (приватный режим) — держим значение в памяти.
  let memoryRaw: string | null = null;
  let cache: { raw: string | null; value: T } | null = null;

  function readRaw(): string | null {
    try {
      return localStorage.getItem(key) ?? memoryRaw;
    } catch {
      return memoryRaw;
    }
  }

  function get(): T {
    const raw = readRaw();
    if (cache && cache.raw === raw) return cache.value; // та же ссылка — без лишних рендеров
    let value = fallback;
    if (raw) {
      try {
        value = JSON.parse(raw) as T;
      } catch {
        // повреждённые данные — берём значение по умолчанию
      }
    }
    cache = { raw, value };
    return value;
  }

  function set(next: T | ((prev: T) => T)) {
    const value = typeof next === "function" ? (next as (prev: T) => T)(get()) : next;
    const raw = JSON.stringify(value);
    memoryRaw = raw;
    try {
      localStorage.setItem(key, raw);
    } catch {
      // приватный режим и т.п. — значение останется в памяти до перезагрузки
    }
    cache = { raw, value };
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { get, set, subscribe, getServer: () => fallback };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.getServer);
}
