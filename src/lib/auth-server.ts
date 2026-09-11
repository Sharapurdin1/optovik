// Вход по телефону на СЕРВЕРЕ: генерация и проверка кода, регистрация аккаунта.
//
// Код создаётся и проверяется здесь (не в браузере) — это безопасно.
// Аккаунт клиента хранится в базе (таблица customers).

import "server-only";
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

export async function requestLoginCode(
  phone: string
): Promise<RequestCodeResult> {
  const code = String(Math.floor(1000 + Math.random() * 9000));
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

  // СМС-сервис не настроен — работаем в демо-режиме (код на экран).
  if (!smsConfigured()) return { ok: true, demoCode: code };

  // Настроен, но отправка не удалась — честная ошибка.
  return { ok: false, error: sms.error ?? "Не удалось отправить код" };
}

export type VerifyResult = {
  ok: boolean;
  error?: string;
  name?: string | null;
  needName?: boolean; // true, если у аккаунта ещё нет имени (просим ввести)
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
    await db.insert(schema.customers).values({
      phone,
      name: null,
      createdAt: new Date().toISOString(),
    });
  }

  const name = existing[0]?.name ?? null;
  return { ok: true, name, needName: !name };
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
