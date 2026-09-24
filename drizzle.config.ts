// Настройки инструмента drizzle-kit — им создаём миграции и смотрим базу.
//   npm run db:generate — создать миграцию по изменениям в src/db/schema.ts
//   npm run db:migrate  — применить миграции (сервер делает это и сам при старте)
//   npm run db:studio   — просмотрщик базы в браузере
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
