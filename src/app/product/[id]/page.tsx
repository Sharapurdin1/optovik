// Страница товара: фото, цена, описание, кнопка «В корзину».
// У каждого товара своя ссылка — её можно отправить и она попадает в поиск.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { discountPercent, formatPrice, inStock } from "@/lib/products";
import { CartControls, ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";

async function findProduct(rawId: string) {
  const id = decodeURIComponent(rawId); // id бывает кириллицей
  const catalog = await getCatalog();
  const product = catalog.products.find((p) => p.id === id);
  return { product, catalog };
}

export async function generateMetadata({
  params,
}: PageProps<"/product/[id]">): Promise<Metadata> {
  const { product } = await findProduct((await params).id);
  if (!product) return { title: "Товар не найден" };
  const description =
    product.description.trim().slice(0, 160) ||
    `${product.title}, ${product.unit} — ${formatPrice(product.price)}. Доставка продуктов на дом в Махачкале.`;
  return {
    title: `${product.title} — ${formatPrice(product.price)}`,
    description,
    // openGraph страницы заменяет общий целиком — повторяем название сайта,
    // а без фото товара показываем общую картинку магазина.
    openGraph: {
      type: "website",
      locale: "ru_RU",
      siteName: "Оптовик",
      title: product.title,
      description,
      images: [product.images[0] ?? "/og.png"],
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/product/[id]">) {
  const { product, catalog } = await findProduct((await params).id);
  if (!product) notFound();

  const category = catalog.categories.find((c) => c.id === product.categoryId);
  const discount = discountPercent(product);
  const available = inStock(product);
  const related = catalog.products
    .filter((p) => p.categoryId === product.categoryId && p.id !== product.id)
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-5">
      <nav className="text-sm text-neutral-500">
        <Link href="/shop" className="hover:text-emerald-600">
          Магазин
        </Link>
        {category && (
          <>
            {" › "}
            <Link href={`/shop?cat=${encodeURIComponent(category.id)}`} className="hover:text-emerald-600">
              {category.title}
            </Link>
          </>
        )}
      </nav>

      <div className="grid md:grid-cols-2 gap-5">
        <ProductGallery
          images={product.images}
          title={product.title}
          emoji={product.emoji}
          dimmed={!available}
        />

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold leading-tight">{product.title}</h1>
            <div className="text-neutral-500 mt-1">{product.unit}</div>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{formatPrice(product.price)}</span>
            {product.oldPrice && (
              <span className="text-lg text-neutral-400 line-through">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            {discount > 0 && (
              <span className="rounded-md bg-red-500 text-white text-sm font-bold px-2 py-0.5">
                −{discount}%
              </span>
            )}
          </div>

          {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
            <p className="text-sm text-amber-700">Осталось мало: {product.stock}</p>
          )}

          <CartControls product={product} size="lg" />

          {product.description.trim() && (
            <div className="bg-white rounded-2xl border border-neutral-200 p-4">
              <h2 className="font-semibold mb-1">Описание</h2>
              <p className="text-neutral-700 whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-3">Ещё {category ? `в «${category.title}»` : "товары"}</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
            {related.map((p) => (
              <div key={p.id} className="w-40 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
