"use client";

// Состояние корзины на React Context.
// Хранит товары, считает сумму, сохраняет выбор в localStorage браузера
// и управляет открытием боковой панели корзины.

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { type Product } from "./products";
import { useCatalog } from "./catalog-context";
import { createLocalStore, useLocalStore } from "./local-store";

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

// В localStorage храним только { productId: количество }.
type StoredCart = Record<string, number>;

const cartStore = createLocalStore<StoredCart>("optovik-cart", {});
const setCounts = cartStore.set;

export function CartProvider({ children }: { children: ReactNode }) {
  const { productById } = useCatalog();
  const counts = useLocalStore(cartStore);
  const [isOpen, setIsOpen] = useState(false);

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
        setCounts((prev) => {
          const current = prev[productId] ?? 0;
          // Больше, чем есть на складе, положить нельзя.
          const stock = productById(productId)?.stock;
          if (stock != null && current >= stock) return prev;
          return { ...prev, [productId]: current + 1 };
        }),
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
