// Защита панели владельца (/manage) паролем.
//
// Пароль хранится в секретной настройке ADMIN_PASSWORD (env), не в коде.
// После верного ввода ставится подписанная cookie-сессия; подделать её
// без пароля нельзя (внутри — HMAC-подпись на секрете-пароле).
// Сессия живёт 30 дней: даже унесённая cookie потом не откроет панель.
// Смена пароля сразу выкидывает все сессии.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "admin_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 дней

// Подпись срока действия сессии, завязанная на пароль.
function sign(pw: string, exp: number): string {
  return createHmac("sha256", pw).update(`optovik-admin-v2:${exp}`).digest("hex");
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

// Открыть сессию владельца: cookie вида "<срок>.<подпись>".
export async function setAdminSession(): Promise<void> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return;
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  (await cookies()).set(ADMIN_COOKIE, `${exp}.${sign(pw, exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

// Есть ли у текущего запроса валидная и не просроченная админ-сессия.
export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const dot = value.indexOf(".");
  const exp = Number(value.slice(0, dot));
  if (dot < 0 || !Number.isSafeInteger(exp) || exp < Date.now()) return false;
  return safeEqual(value.slice(dot + 1), sign(pw, exp));
}
