// Настройки инструмента drizzle-kit — им создаём/обновляем таблицы в базе.
// Локально работаем с файлом SQLite; если задан токен облака (Turso) —
// переключаемся на него.
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/optovik.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig(
  authToken
    ? {
        dialect: "turso",
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url, authToken },
      }
    : {
        dialect: "sqlite",
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url },
      }
);
