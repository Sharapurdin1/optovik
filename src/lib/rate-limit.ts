// Ограничение частоты запросов (rate limit).
// Счётчик хранится в базе: на каждый «ключ» — не больше N запросов за окно.

import "server-only";
import { sql } from "drizzle-orm";
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
//
// Счёт — одним запросом к базе («+1 и сразу узнать итог»): если прочитать
// счётчик и записать отдельно, пачка одновременных запросов успевает
// прочитать одно и то же значение и проскочить лимит.
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateResult> {
  const now = Date.now();
  const t = schema.rateLimits;
  // Окно истекло — начинаем новое с этого запроса.
  const expired = sql`${t.windowStart} <= ${now - windowMs}`;
  try {
    const [rec] = await db
      .insert(t)
      .values({ key, count: 1, windowStart: now })
      .onConflictDoUpdate({
        target: t.key,
        set: {
          count: sql`case when ${expired} then 1 else ${t.count} + 1 end`,
          windowStart: sql`case when ${expired} then ${now} else ${t.windowStart} end`,
        },
      })
      .returning({ count: t.count, windowStart: t.windowStart });

    if (rec.count <= limit) return { allowed: true, retryAfterSec: 0 };
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((rec.windowStart + windowMs - now) / 1000)),
    };
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
