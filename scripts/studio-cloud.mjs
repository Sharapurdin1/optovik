// Открывает Drizzle Studio на ОБЛАЧНОЙ базе Turso (боевые заказы).
// Читает ключи из .env.turso и запускает просмотрщик с ними.
//
// Запуск: npm run db:studio:cloud   → откройте https://local.drizzle.studio

import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

const env = { ...process.env };
try {
  const text = readFileSync(new URL("../.env.turso", import.meta.url), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
} catch {
  console.error(
    "Не найден файл .env.turso с ключами облачной базы. Он должен лежать в корне проекта."
  );
  process.exit(1);
}

if (!env.DATABASE_URL || !env.DATABASE_AUTH_TOKEN) {
  console.error("В .env.turso нет DATABASE_URL или DATABASE_AUTH_TOKEN.");
  process.exit(1);
}

console.log("Открываю просмотрщик ОБЛАЧНОЙ базы (Turso)…");
spawn("npx", ["drizzle-kit", "studio"], { stdio: "inherit", env });
