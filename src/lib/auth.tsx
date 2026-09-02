"use client";

// Авторизация по номеру телефона.
//
// ВАЖНО (демо-режим): код подтверждения сейчас генерируется прямо в браузере
// и показывается на экране — настоящая SMS НЕ отправляется.
// Для реального запуска нужно:
//   1) подключить SMS-сервис (SMSC.ru, SMS Aero и т.п.);
//   2) генерировать и проверять код на сервере, а не в браузере.
// Тогда меняется только реализация requestCode/verifyCode — экраны останутся.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type User = {
  phone: string; // в формате +7XXXXXXXXXX
};

type AuthContextValue = {
  user: User | null;
  isModalOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => void;
  /** «Отправляет» код на телефон. В демо возвращает код для показа на экране. */
  requestCode: (phone: string) => string;
  /** Проверяет введённый код. Возвращает true при успехе и выполняет вход. */
  verifyCode: (phone: string, code: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "optovik-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Код, который мы «отправили» (демо). В реальности хранится на сервере.
  const [sentCode, setSentCode] = useState<string | null>(null);

  // Восстанавливаем вход при заходе.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {
      // игнорируем повреждённые данные
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isModalOpen,
      openLogin: () => setIsModalOpen(true),
      closeLogin: () => setIsModalOpen(false),
      logout: () => {
        setUser(null);
        setSentCode(null);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
      },
      requestCode: (phone: string) => {
        // Демо: случайный 4-значный код.
        const code = String(Math.floor(1000 + Math.random() * 9000));
        setSentCode(code);
        return code;
      },
      verifyCode: (phone: string, code: string) => {
        if (!sentCode || code !== sentCode) return false;
        const nextUser: User = { phone };
        setUser(nextUser);
        setSentCode(null);
        setIsModalOpen(false);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        } catch {}
        return true;
      },
    }),
    [user, isModalOpen, sentCode]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth должен вызываться внутри <AuthProvider>");
  return ctx;
}

/** Приводит ввод к виду +7XXXXXXXXXX (11 цифр). Возвращает null, если номер неполный. */
export function normalizePhone(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) {
    digits = "7" + digits.slice(1);
  } else if (digits.length === 10) {
    digits = "7" + digits;
  } else {
    return null;
  }
  return "+" + digits;
}

/** Красивый показ номера: +7 (999) 123-45-67 */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.length !== 11) return phone;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`;
}
