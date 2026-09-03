import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { OrdersProvider } from "@/lib/orders";
import { CatalogProvider } from "@/lib/catalog-context";
import { getCatalog } from "@/lib/catalog";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Оптовик — доставка продуктов на дом",
  description: "Быстрая доставка продуктов на дом в Махачкале",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Загружаем каталог из Google-таблицы (или из встроенного списка, если
  // таблица ещё не подключена) и раздаём его всем экранам.
  const { products, categories } = await getCatalog();

  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-200">
        <AuthProvider>
          <CatalogProvider products={products} categories={categories}>
            <OrdersProvider>
              <CartProvider>
                <Header />
                {/* отступ снизу — чтобы контент не прятался под нижним меню */}
                <main className="flex-1 pb-20">{children}</main>
                <BottomNav />
                <AuthModal />
              </CartProvider>
            </OrdersProvider>
          </CatalogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
