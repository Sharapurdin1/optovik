// Старт сервера: проверяем настройки и применяем миграции базы.
// Если что-то не так — процесс завершается (Docker перезапустит контейнер,
// а в логах будет понятная причина). Иначе Next остался бы висеть и
// отвечать ошибкой 500 на каждый запрос.

import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { validateEnv } from "@/lib/env";
import { db } from "@/db";

try {
  validateEnv();
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), "drizzle"),
  });
  console.log("✅ Миграции базы применены");
} catch (e) {
  console.error("❌ Сервер не запущен:", e);
  process.exit(1);
}
