// Вход по телефону на СЕРВЕРЕ: генерация и проверка кода, регистрация аккаунта.
//
// Код создаётся и проверяется здесь (не в браузере) — это безопасно.
// Аккаунт клиента хранится в базе (таблица customers).

import "server-only";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { sendSms, smsConfigured } from "./sms";

const CODE_TTL_MS = 5 * 60 * 1000; // код живёт 5 минут
const MAX_ATTEMPTS = 5; // сколько раз можно ошибиться

export type RequestCodeResult = {
  ok: boolean;
  demoCode?: string; // показываем на экране, только когда СМС не настроены
  error?: string;
};

// Демо-режим (код на экране) — только при разработке. На боевом сервере без
// СМС-сервиса вход по телефону выключен: иначе любой мог бы войти под чужим
// номером, увидев «его» код на экране.
function demoLoginAllowed(): boolean {
  return process.env.NODE_ENV !== "production";
}

export async function requestLoginCode(
  phone: string
): Promise<RequestCodeResult> {
  if (!smsConfigured() && !demoLoginAllowed()) {
    return { ok: false, error: "Вход по телефону пока недоступен" };
  }
  const code = String(randomInt(1000, 10000)); // криптостойкий, не Math.random
  const expiresAt = Date.now() + CODE_TTL_MS;

  await db
    .insert(schema.authCodes)
    .values({ phone, code, expiresAt, attempts: 0 })
    .onConflictDoUpdate({
      target: schema.authCodes.phone,
      set: { code, expiresAt, attempts: 0 },
    });

  const sms = await sendSms(phone, `Код для входа в Оптовик: ${code}`);
  if (sms.sent) return { ok: true };

  // СМС-сервис не настроен (только при разработке) — код на экран.
  if (!smsConfigured()) return { ok: true, demoCode: code };

  // Настроен, но отправка не удалась — честная ошибка.
  return { ok: false, error: sms.error ?? "Не удалось отправить код" };
}

// Является ли номер «владельцем» (список в env OWNER_PHONES, через запятую).
export function isOwnerPhone(phone: string): boolean {
  const raw = process.env.OWNER_PHONES;
  if (!raw) return false;
  const owners = raw
    .split(",")
    .map((s) => s.replace(/\D/g, ""))
    .filter(Boolean);
  return owners.includes(phone.replace(/\D/g, ""));
}

export type VerifyResult = {
  ok: boolean;
  error?: string;
  name?: string | null;
  needName?: boolean; // true, если у аккаунта ещё нет имени (просим ввести)
  isOwner?: boolean; // true, если вошёл владелец (доступ к панели /manage)
};

export async function verifyLoginCode(
  phone: string,
  code: string
): Promise<VerifyResult> {
  const rows = await db
    .select()
    .from(schema.authCodes)
    .where(eq(schema.authCodes.phone, phone));
  const rec = rows[0];

  if (!rec) return { ok: false, error: "Сначала запросите код" };

  if (Date.now() > rec.expiresAt) {
    await db.delete(schema.authCodes).where(eq(schema.authCodes.phone, phone));
    return { ok: false, error: "Код истёк — запросите новый" };
  }
  if (rec.attempts >= MAX_ATTEMPTS) {
    await db.delete(schema.authCodes).where(eq(schema.authCodes.phone, phone));
    return { ok: false, error: "Слишком много попыток — запросите новый код" };
  }
  if (rec.code !== code) {
    await db
      .update(schema.authCodes)
      .set({ attempts: rec.attempts + 1 })
      .where(eq(schema.authCodes.phone, phone));
    return { ok: false, error: "Неверный код. Попробуйте ещё раз" };
  }

  // Код верный — удаляем его и регистрируем аккаунт, если новый.
  await db.delete(schema.authCodes).where(eq(schema.authCodes.phone, phone));

  const existing = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.phone, phone));
  if (existing.length === 0) {
    await db.insert(schema.customers).values({ phone, name: null });
  }

  const name = existing[0]?.name ?? null;
  // Права владельца — только если код действительно пришёл по СМС на этот номер.
  const isOwner = smsConfigured() && isOwnerPhone(phone);
  return { ok: true, name, needName: !name, isOwner };
}

// Сохранить имя клиента (после регистрации).
export async function setCustomerName(
  phone: string,
  name: string
): Promise<void> {
  await db
    .update(schema.customers)
    .set({ name })
    .where(eq(schema.customers.phone, phone));
}
