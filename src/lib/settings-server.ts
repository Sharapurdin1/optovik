// Чтение и запись настроек магазина в базе (одна строка id=1).

import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { DEFAULT_SETTINGS, type Settings } from "./settings";

export async function getSettings(): Promise<Settings> {
  try {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.id, 1));
    const r = rows[0];
    if (!r) return DEFAULT_SETTINGS;
    return {
      acceptingOrders: r.acceptingOrders,
      workFrom: r.workFrom,
      workTo: r.workTo,
      minOrder: r.minOrder,
      deliveryFee: r.deliveryFee,
      freeDeliveryFrom: r.freeDeliveryFrom,
    };
  } catch (e) {
    console.error("Настройки не прочитались, беру значения по умолчанию:", e);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  const row = {
    id: 1,
    acceptingOrders: s.acceptingOrders,
    workFrom: s.workFrom,
    workTo: s.workTo,
    minOrder: s.minOrder,
    deliveryFee: s.deliveryFee,
    freeDeliveryFrom: s.freeDeliveryFrom,
  };
  await db
    .insert(schema.settings)
    .values(row)
    .onConflictDoUpdate({ target: schema.settings.id, set: row });
}
