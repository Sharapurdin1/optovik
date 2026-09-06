// Отправка СМС через SMS Aero.
//
// Пока не заданы настройки (SMS_AERO_EMAIL / SMS_AERO_API_KEY) — ничего
// не отправляем и сообщаем об этом (тогда вход работает в демо-режиме:
// код показывается на экране).

import "server-only";

export type SmsResult = { sent: boolean; error?: string };

export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_AERO_EMAIL && process.env.SMS_AERO_API_KEY);
}

export async function sendSms(phone: string, text: string): Promise<SmsResult> {
  const email = process.env.SMS_AERO_EMAIL;
  const apiKey = process.env.SMS_AERO_API_KEY;
  const sign = process.env.SMS_AERO_SIGN || "SMS Aero";
  if (!email || !apiKey) return { sent: false, error: "СМС-сервис не настроен" };

  const number = phone.replace(/\D/g, "");
  const url = new URL("https://gate.smsaero.ru/v2/sms/send");
  url.searchParams.set("number", number);
  url.searchParams.set("text", text);
  url.searchParams.set("sign", sign);
  const auth = Buffer.from(`${email}:${apiKey}`).toString("base64");

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}` },
    });
    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; message?: string }
      | null;
    if (!res.ok || !data?.success) {
      const msg = data?.message ?? `HTTP ${res.status}`;
      console.error("SMS Aero: ошибка отправки:", msg);
      return { sent: false, error: String(msg) };
    }
    return { sent: true };
  } catch (e) {
    console.error("SMS Aero: сеть недоступна:", e);
    return { sent: false, error: "Сеть недоступна" };
  }
}
