// Ограничение частоты запросов (rate limit).
// Счётчик хранится в базе: на каждый «ключ» — не больше N запросов за окно.

import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type RateResult = { allowed: boolean; retryAfterSec: number };

// IP клиента. Caddy перед приложением сам ставит x-forwarded-for
// (заголовок от клиента он отбрасывает), поэтому первому значению можно верить.
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

// Разрешить не больше `limit` запросов за `windowMs` на ключ `key`.
// При ошибке базы — пропускаем (чтобы сбой не блокировал вход).
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateResult> {
  const now = Date.now();
  try {
    const rows = await db
      .select()
      .from(schema.rateLimits)
      .where(eq(schema.rateLimits.key, key));
    const rec = rows[0];

    // Нет записи или окно истекло — начинаем новое окно.
    if (!rec || now - rec.windowStart >= windowMs) {
      await db
        .insert(schema.rateLimits)
        .values({ key, count: 1, windowStart: now })
        .onConflictDoUpdate({
          target: schema.rateLimits.key,
          set: { count: 1, windowStart: now },
        });
      return { allowed: true, retryAfterSec: 0 };
    }

    // Лимит исчерпан.
    if (rec.count >= limit) {
      return {
        allowed: false,
        retryAfterSec: Math.ceil((rec.windowStart + windowMs - now) / 1000),
      };
    }

    // Ещё можно — увеличиваем счётчик.
    await db
      .update(schema.rateLimits)
      .set({ count: rec.count + 1 })
      .where(eq(schema.rateLimits.key, key));
    return { allowed: true, retryAfterSec: 0 };
  } catch (e) {
    console.error("rate limit: ошибка базы, пропускаю запрос:", e);
    return { allowed: true, retryAfterSec: 0 };
  }
}

// Красивый ответ при превышении лимита.
export function tooMany(retryAfterSec: number, what = "запросов"): Response {
  let when: string;
  if (retryAfterSec >= 3600) when = `${Math.ceil(retryAfterSec / 3600)} ч.`;
  else if (retryAfterSec >= 60) when = `${Math.ceil(retryAfterSec / 60)} мин.`;
  else when = `${retryAfterSec} сек.`;
  return Response.json(
    { ok: false, error: `Слишком много ${what}. Попробуйте через ${when}` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
  );
}
