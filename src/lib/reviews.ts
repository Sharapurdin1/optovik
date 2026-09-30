// Отзывы покупателей о доставленных заказах.

import "server-only";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type AdminReview = {
  id: number;
  orderId: string;
  rating: number;
  text: string;
  name: string;
  phone: string | null;
  published: boolean;
  createdAt: string;
};

export type PublicReview = { id: number; rating: number; text: string; name: string };

// «Магомед Алиев» → «Магомед А.» — на сайте не показываем фамилию целиком.
export function shortName(full: string): string {
  const [first = "", second = ""] = full.trim().split(/\s+/);
  const short = second ? `${first} ${second[0]}.` : first;
  return short.slice(0, 30) || "Покупатель";
}

// Сохранить отзыв. false — отзыв на этот заказ уже есть.
export async function addReview(r: {
  orderId: string;
  rating: number;
  text: string;
  name: string;
}): Promise<boolean> {
  const rows = await db
    .insert(schema.reviews)
    .values(r)
    .onConflictDoNothing({ target: schema.reviews.orderId })
    .returning({ id: schema.reviews.id });
  return rows.length > 0;
}

// Все отзывы для админки (новые сверху) — с телефоном из заказа, чтобы
// можно было перезвонить недовольному.
export async function getAllReviews(): Promise<AdminReview[]> {
  const rows = await db
    .select({
      id: schema.reviews.id,
      orderId: schema.reviews.orderId,
      rating: schema.reviews.rating,
      text: schema.reviews.text,
      name: schema.reviews.name,
      phone: schema.orders.phone,
      published: schema.reviews.published,
      createdAt: schema.reviews.createdAt,
    })
    .from(schema.reviews)
    .leftJoin(schema.orders, eq(schema.orders.id, schema.reviews.orderId))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(500);
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function setReviewPublished(id: number, published: boolean): Promise<boolean> {
  const rows = await db
    .update(schema.reviews)
    .set({ published })
    .where(eq(schema.reviews.id, id))
    .returning({ id: schema.reviews.id });
  return rows.length > 0;
}

// Одобренные владельцем отзывы для главной. Сбой базы — просто без отзывов.
export async function getPublishedReviews(limit = 6): Promise<PublicReview[]> {
  try {
    const rows = await db
      .select({
        id: schema.reviews.id,
        rating: schema.reviews.rating,
        text: schema.reviews.text,
        name: schema.reviews.name,
      })
      .from(schema.reviews)
      .where(eq(schema.reviews.published, true))
      .orderBy(desc(schema.reviews.createdAt))
      .limit(limit);
    return rows.map((r) => ({ ...r, name: shortName(r.name) }));
  } catch (e) {
    console.error("Отзывы не загрузились:", e);
    return [];
  }
}
