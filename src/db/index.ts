// Подключение к базе данных (PostgreSQL).
//
// Отдаёт готовый объект `db`, через который остальной код читает и пишет
// данные. Пул подключений создаётся один раз и переиспользуется (важно в
// режиме разработки, где код часто перезагружается).

import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

function createDb() {
  const pool = new Pool({
    // Проверка, что переменная задана, — при старте сервера (src/lib/env.ts).
    connectionString: process.env.DATABASE_URL,
    max: 10, // одного VPS-инстанса хватает с запасом
  });
  // Ошибка «простаивающего» соединения не должна ронять весь сервер.
  pool.on("error", (e) => console.error("PostgreSQL: ошибка соединения:", e));
  return drizzle({ client: pool });
}

// Кэшируем в globalThis, чтобы при горячей перезагрузке в dev не плодить пулы.
const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof createDb>;
};

export const db = globalForDb.__db ?? createDb();

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
