// Серверные сессии входа покупателя.
//
// После проверки кода мы выдаём подписанную cookie-сессию. Её нельзя
// подделать без секрета (SESSION_SECRET), поэтому сервер доверяет ей,
// кто вошёл. Действия «от имени себя» (например, смена имени) берут номер
// из этой сессии, а не из тела запроса.

import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30 дней

// Секрет подписи. Если отдельный не задан — берём пароль владельца.
function secret(): string | null {
  return process.env.SESSION_SECRET ?? process.env.ADMIN_PASSWORD ?? null;
}

function sign(payload: string, sec: string): string {
  return createHmac("sha256", sec).update(payload).digest("base64url");
}

export type Session = { phone: string };

// Собираем подписанный токен вида "<данные>.<подпись>".
function makeToken(phone: string): string | null {
  const sec = secret();
  if (!sec) return null;
  const payload = Buffer.from(
    JSON.stringify({ phone, exp: Date.now() + MAX_AGE_SEC * 1000 })
  ).toString("base64url");
  return `${payload}.${sign(payload, sec)}`;
}

function readToken(token: string): Session | null {
  const sec = secret();
  if (!sec) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, sec);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof data.phone !== "string" || typeof data.exp !== "number") return null;
    if (Date.now() > data.exp) return null;
    return { phone: data.phone };
  } catch {
    return null;
  }
}

export async function setSession(phone: string): Promise<void> {
  const token = makeToken(phone);
  if (!token) return;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

// Кто сейчас вошёл (или null). Доверяем только подписи, не браузеру.
export async function getSession(): Promise<Session | null> {
  const val = (await cookies()).get(SESSION_COOKIE)?.value;
  return val ? readToken(val) : null;
}
