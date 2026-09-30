// Секретный ключ покупателя к его заказу.
//
// При оформлении браузер получает случайный ключ (хранит вместе с заказом в
// «Моих заказах»), а в базе лежит только его хэш. С ключом покупатель может
// сам отменить заказ или оставить отзыв. Номер заказа — это время, его можно
// подобрать; ключ (192 случайных бита) — нельзя.

import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

function hash(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function newCustomerKey(): { key: string; hash: string } {
  const key = randomBytes(24).toString("base64url");
  return { key, hash: hash(key) };
}

export type KeyedOrder = { id: string; status: string; name: string; phone: string };

// Заказ, если ключ к нему верный; иначе null.
export async function orderByCustomerKey(id: string, key: string): Promise<KeyedOrder | null> {
  if (!id || !key || id.length > 32 || key.length > 64) return null;
  const [o] = await db
    .select({
      id: schema.orders.id,
      status: schema.orders.status,
      name: schema.orders.name,
      phone: schema.orders.phone,
      keyHash: schema.orders.customerKeyHash,
    })
    .from(schema.orders)
    .where(eq(schema.orders.id, id));
  if (!o?.keyHash) return null;
  const a = Buffer.from(o.keyHash);
  const b = Buffer.from(hash(key));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: o.id, status: o.status, name: o.name, phone: o.phone };
}
