// Общие помощники для API админки (/api/admin/*).

import "server-only";
import { isAdmin } from "./admin-auth";

// null — доступ есть; иначе готовый ответ 401.
export async function denyUnlessAdmin(): Promise<Response | null> {
  if (await isAdmin()) return null;
  return Response.json({ ok: false, error: "Нет доступа" }, { status: 401 });
}

export function fail(error: string, status = 400): Response {
  return Response.json({ ok: false, error }, { status });
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// Ошибка сервера: подробности — в лог, пользователю — общий текст.
export function serverError(what: string, e: unknown): Response {
  console.error(`${what}:`, e);
  return fail("Ошибка сервера, попробуйте ещё раз", 500);
}
