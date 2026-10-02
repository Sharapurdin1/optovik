import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/auth";
import { OrdersProvider } from "@/lib/orders";
import { CatalogProvider } from "@/lib/catalog-context";
import { getCatalog } from "@/lib/catalog";
import { SettingsProvider } from "@/lib/settings-context";
import { getSettings } from "@/lib/settings-server";
import { loginEnabled } from "@/lib/auth-server";
import { siteUrl } from "@/lib/site";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { AuthModal } from "@/components/AuthModal";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Оптовик — доставка продуктов на дом в Махачкале",
};

const DESCRIPTION =
  "Доставка продуктов на дом в Махачкале: овощи и фрукты, молочное, мясо, хлеб, напитки. Заказ онлайн, оплата курьеру.";

// Метаданные собираются во время запроса: адрес сайта (APP_URL) известен
// только на сервере, а не при сборке образа.
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(siteUrl()),
    title: {
      default: "Оптовик — доставка продуктов на дом в Махачкале",
      template: "%s · Оптовик",
    },
    description: DESCRIPTION,
    applicationName: "Оптовик",
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Оптовик",
      title: "Оптовик — доставка продуктов на дом",
      description: DESCRIPTION,
      // Картинка для превью ссылки в WhatsApp, Telegram, VK.
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image" },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Страницы собираются на каждый запрос: настройки (и скоро каталог) живут в
  // базе и меняются владельцем. Заодно сборка Docker-образа не лезет в базу.
  await connection();

  // Загружаем каталог из Google-таблицы (или из встроенного списка, если
  // таблица ещё не подключена) и раздаём его всем экранам.
  const { products, categories } = await getCatalog();
  const settings = await getSettings();

  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-neutral-200">
        <AuthProvider loginEnabled={loginEnabled()}>
          <SettingsProvider value={settings}>
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
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
