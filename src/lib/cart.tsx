"use client";

// Состояние корзины на React Context.
// Хранит товары, считает сумму, сохраняет выбор в localStorage браузера
// и управляет открытием боковой панели корзины.

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Product } from "./products";
import { useCatalog } from "./catalog-context";

export type CartLine = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  lines: CartLine[];
  totalCount: number;
  totalPrice: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  quantityOf: (productId: string) => number;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "optovik-cart";

// В localStorage храним только { productId: количество }.
type StoredCart = Record<string, number>;

export function CartProvider({ children }: { children: ReactNode }) {
  const { productById } = useCatalog();
  const [counts, setCounts] = useState<StoredCart>({});
  const [isOpen, setIsOpen] = useState(false);

  // Загружаем сохранённую корзину при первом запуске в браузере.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setCounts(JSON.parse(raw));
    } catch {
      // повреждённые данные — просто игнорируем
    }
  }, []);

  // Сохраняем при каждом изменении.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch {
      // приватный режим и т.п. — не критично
    }
  }, [counts]);

  const value = useMemo<CartContextValue>(() => {
    const lines: CartLine[] = Object.entries(counts)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const product = productById(id);
        return product ? { product, quantity: qty } : null;
      })
      .filter((l): l is CartLine => l !== null);

    const totalCount = lines.reduce((sum, l) => sum + l.quantity, 0);
    const totalPrice = lines.reduce(
      (sum, l) => sum + l.quantity * l.product.price,
      0
    );

    return {
      lines,
      totalCount,
      totalPrice,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add: (productId: string) =>
        setCounts((prev) => ({
          ...prev,
          [productId]: (prev[productId] ?? 0) + 1,
        })),
      remove: (productId: string) =>
        setCounts((prev) => {
          const next = { ...prev };
          const current = next[productId] ?? 0;
          if (current <= 1) delete next[productId];
          else next[productId] = current - 1;
          return next;
        }),
      quantityOf: (productId: string) => counts[productId] ?? 0,
      clear: () => setCounts({}),
    };
  }, [counts, isOpen, productById]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart должен вызываться внутри <CartProvider>");
  return ctx;
}
