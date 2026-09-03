"use client";

// Раздаёт загруженный каталог (товары и категории) всем экранам приложения.
// Данные приходят с сервера (getCatalog) и кладутся сюда один раз при загрузке.

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Product, Category } from "./products";

type CatalogContextValue = {
  products: Product[];
  categories: Category[];
  hitProducts: Product[];
  productById: (id: string) => Product | undefined;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({
  products,
  categories,
  children,
}: {
  products: Product[];
  categories: Category[];
  children: ReactNode;
}) {
  const value = useMemo<CatalogContextValue>(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      products,
      categories,
      hitProducts: products.filter((p) => p.hit),
      productById: (id: string) => byId.get(id),
    };
  }, [products, categories]);

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx)
    throw new Error("useCatalog должен вызываться внутри <CatalogProvider>");
  return ctx;
}
