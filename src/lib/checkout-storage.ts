"use client";

// Данные покупателя для доставки — запоминаем в браузере после заказа,
// чтобы в следующий раз не вводить имя, телефон и адрес заново.
// Хранятся только на устройстве покупателя (localStorage).

import { useSyncExternalStore } from "react";

export type SavedCheckout = {
  name: string;
  phone: string;
  street: string;
  apartment: string;
  entrance: string;
  floor: string;
  intercom: string;
  payment: string;
};

const KEY = "optovik-checkout";
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadCheckout(): SavedCheckout | null {
  const raw = read();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedCheckout;
  } catch {
    return null;
  }
}

export function saveCheckout(data: SavedCheckout): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // приватный режим и т.п. — не критично
  }
  listeners.forEach((l) => l());
}

export function clearCheckout(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

// Подписка на сохранённые данные (на сервере — null, без рассинхрона при гидрации).
export function useSavedCheckout(): SavedCheckout | null {
  const raw = useSyncExternalStore(subscribe, read, () => null);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedCheckout;
  } catch {
    return null;
  }
}
