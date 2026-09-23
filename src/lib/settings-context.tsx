"use client";

// Раздаёт настройки магазина всем экранам (данные приходят с сервера).

import { createContext, useContext, type ReactNode } from "react";
import type { Settings } from "./settings";

const SettingsContext = createContext<Settings | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: Settings;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const s = useContext(SettingsContext);
  if (!s) throw new Error("useSettings должен вызываться внутри <SettingsProvider>");
  return s;
}
