"use client";

// Авторизация по номеру телефона.
//
// Код генерируется и проверяется НА СЕРВЕРЕ (см. /api/auth/*), а аккаунт
// хранится в базе. Отправка кода в СМС — через SMS Aero; пока СМС-сервис
// не настроен, сервер возвращает код для показа на экране (демо-режим).

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createLocalStore, useLocalStore } from "./local-store";

// Функции телефона живут в нейтральном модуле; ре-экспортим для совместимости.
export { normalizePhone, formatPhone, formatPhoneInput } from "./phone";

export type User = {
  phone: string; // в формате +7XXXXXXXXXX
  name?: string | null;
  isOwner?: boolean; // владелец магазина — есть доступ к панели /manage
};

export type RequestCodeResult = {
  ok: boolean;
  demoCode?: string;
  phone?: string; // нормализованный номер — им подтверждаем код
  error?: string;
  cooldownSec?: number; // пауза до следующего запроса кода
  retryAfterSec?: number; // сколько ждать, если лимит превышен
};
export type VerifyResult = {
  ok: boolean;
  error?: string;
  name?: string | null;
  needName?: boolean;
  isOwner?: boolean;
};

type AuthContextValue = {
  user: User | null;
  /** Работает ли вход по телефону (на проде — только с СМС-сервисом). */
  loginEnabled: boolean;
  isModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => void;
  /** Просит сервер отправить код на телефон. */
  requestCode: (phone: string) => Promise<RequestCodeResult>;
  /** Проверяет код на сервере; при успехе выполняет вход (окно НЕ закрывает). */
  verifyCode: (phone: string, code: string) => Promise<VerifyResult>;
  /** Сохраняет имя клиента (шаг регистрации). */
  saveName: (name: string) => Promise<{ ok: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Кэш вошедшего пользователя в браузере — чтобы шапка сразу показывала имя.
// Истина — серверная сессия (сверяемся с /api/auth/me).
const userStore = createLocalStore<User | null>("optovik-user", null);
const setUser = userStore.set;

export function AuthProvider({
  loginEnabled,
  children,
}: {
  loginEnabled: boolean;
  children: ReactNode;
}) {
  const user = useLocalStore(userStore);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Сверяемся с сервером — истина в серверной сессии.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: User | null }) => {
        if (data.user) {
          setUser(data.user);
        } else {
          // Сервер: действующей сессии нет → выходим.
          setUser(null);
        }
      })
      .catch(() => {
        // нет связи — оставляем то, что показали из кэша
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loginEnabled,
      isModalOpen,
      openLogin: () => setIsModalOpen(true),
      closeLogin: () => setIsModalOpen(false),
      logout: () => {
        setUser(null);
        // Закрываем серверную сессию (и сессию панели владельца).
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
      },
      requestCode: async (phone: string): Promise<RequestCodeResult> => {
        try {
          const res = await fetch("/api/auth/request-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone }),
          });
          return (await res.json()) as RequestCodeResult;
        } catch {
          return { ok: false, error: "Нет связи с сервером" };
        }
      },
      verifyCode: async (phone: string, code: string): Promise<VerifyResult> => {
        try {
          const res = await fetch("/api/auth/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, code }),
          });
          const data = (await res.json()) as VerifyResult;
          if (data.ok) {
            // Вход выполнен; окно закроет уже сам экран (может быть шаг «имя»).
            const nextUser: User = {
              phone,
              name: data.name ?? null,
              isOwner: data.isOwner ?? false,
            };
            setUser(nextUser);
          }
          return data;
        } catch {
          return { ok: false, error: "Нет связи с сервером" };
        }
      },
      saveName: async (name: string) => {
        const phone = user?.phone;
        if (!phone) return { ok: false, error: "Сначала войдите" };
        try {
          const res = await fetch("/api/auth/name", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone, name }),
          });
          const data = (await res.json()) as { ok: boolean; error?: string };
          if (data.ok) {
            const nextUser: User = { phone, name, isOwner: user?.isOwner };
            setUser(nextUser);
          }
          return data;
        } catch {
          return { ok: false, error: "Нет связи с сервером" };
        }
      },
    }),
    [user, isModalOpen, loginEnabled]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  return ctx;
}
