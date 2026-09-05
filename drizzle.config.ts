// Настройки инструмента drizzle-kit — им создаём/обновляем таблицы в базе.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:./data/optovik.db",
  },
});
