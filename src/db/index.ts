// Подключение к базе данных.
//
// Отдаёт готовый объект `db`, через который остальной код читает и пишет
// заказы. Подключение создаётся один раз и переиспользуется (важно в режиме
// разработки, где код часто перезагружается).

import "server-only";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const url = process.env.DATABASE_URL ?? "file:./data/optovik.db";

// Кэшируем подключение в globalThis, чтобы при горячей перезагрузке в dev
// не плодить новые подключения.
const globalForDb = globalThis as unknown as {
  __db?: ReturnType<typeof drizzle>;
};

export const db = globalForDb.__db ?? drizzle(url);

if (process.env.NODE_ENV !== "production") globalForDb.__db = db;

export { schema };
