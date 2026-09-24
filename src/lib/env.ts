// Проверка переменных окружения при старте сервера.
//
// Без обязательных настроек сервер не запускается и сразу пишет, чего не
// хватает, — лучше упасть при деплое, чем сломаться на первом заказе.
// Необязательные только предупреждают: функция работает в запасном режиме.

const REQUIRED = ["DATABASE_URL"] as const;
const REQUIRED_IN_PRODUCTION = ["SESSION_SECRET", "ADMIN_PASSWORD", "APP_URL"] as const;

const OPTIONAL: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: "заказы не будут приниматься без Telegram",
  TELEGRAM_CHAT_ID: "заказы не будут приниматься без Telegram",
  SMS_AERO_EMAIL: "вход по СМС в демо-режиме (код на экране)",
  SMS_AERO_API_KEY: "вход по СМС в демо-режиме (код на экране)",
  OWNER_PHONES: "вход владельца по телефону отключён",
};

export function validateEnv(): void {
  const isProd = process.env.NODE_ENV === "production";
  const required = [...REQUIRED, ...(isProd ? REQUIRED_IN_PRODUCTION : [])];

  const missing = required.filter((k) => !process.env[k]?.trim());
  const problems = missing.map((k) => `не задана ${k}`);

  const secret = process.env.SESSION_SECRET;
  if (isProd && secret && secret.length < 32) {
    problems.push("SESSION_SECRET короче 32 символов");
  }

  if (problems.length > 0) {
    throw new Error(`Ошибка настроек окружения: ${problems.join("; ")}`);
  }

  for (const [k, why] of Object.entries(OPTIONAL)) {
    if (!process.env[k]?.trim()) console.warn(`⚠️ Не задана ${k}: ${why}`);
  }
}
