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

const STORAGE_KEY = "optovik-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Восстанавливаем вход при заходе.
  useEffect(() => {
    // 1) быстрый показ из localStorage (кэш);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // игнорируем повреждённые данные
    }
    // 2) сверяемся с сервером — истина в серверной сессии.
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user: User | null }) => {
        if (data.user) {
          setUser(data.user);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
          } catch {}
        } else {
          // Сервер: действующей сессии нет → выходим.
          setUser(null);
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {}
        }
      })
      .catch(() => {
        // нет связи — оставляем то, что показали из кэша
      });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isModalOpen,
      openLogin: () => setIsModalOpen(true),
      closeLogin: () => setIsModalOpen(false),
      logout: () => {
        setUser(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
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
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
            } catch {}
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
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
            } catch {}
          }
          return data;
        } catch {
          return { ok: false, error: "Нет связи с сервером" };
        }
      },
    }),
    [user, isModalOpen]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  return ctx;
}
