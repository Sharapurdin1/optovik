// Защита панели владельца (/manage) паролем.
//
// Пароль хранится в секретной настройке ADMIN_PASSWORD (env), не в коде.
// После верного ввода ставится подписанная cookie-сессия; подделать её
// без пароля нельзя (внутри — HMAC-подпись на секрете-пароле).

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";

// Значение cookie: неугадываемая подпись, завязанная на пароль.
export function sessionToken(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  return createHmac("sha256", pw).update("optovik-admin-v1").digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

// Проверка введённого пароля (защищена от подбора по времени).
export function checkPassword(input: string): boolean {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return safeEqual(input, pw);
}

// Настроен ли пароль вообще.
export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

// Есть ли у текущего запроса валидная админ-сессия.
export async function isAdmin(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value && safeEqual(value, token));
}
