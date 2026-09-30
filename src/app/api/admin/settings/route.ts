// POST /api/admin/settings — сохранить настройки магазина (только владелец).
import { isAdmin } from "@/lib/admin-auth";
import { saveSettings } from "@/lib/settings-server";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings";

function isTime(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}
function toHttpsUrl(v: unknown): string {
  const s = String(v ?? "").trim().slice(0, 500);
  try {
    return new URL(s).protocol === "https:" ? s : "";
  } catch {
    return "";
  }
}
function toInt(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return Response.json({ ok: false, error: "Нет доступа" }, { status: 401 });
  }
  const b = await req.json().catch(() => ({}));

  const s: Settings = {
    acceptingOrders: Boolean(b.acceptingOrders),
    workFrom: isTime(b.workFrom) ? b.workFrom : DEFAULT_SETTINGS.workFrom,
    workTo: isTime(b.workTo) ? b.workTo : DEFAULT_SETTINGS.workTo,
    minOrder: toInt(b.minOrder, 0),
    deliveryFee: toInt(b.deliveryFee, DEFAULT_SETTINGS.deliveryFee),
    freeDeliveryFrom: toInt(b.freeDeliveryFrom, DEFAULT_SETTINGS.freeDeliveryFrom),
    // Телефон магазина: только цифры, +, пробелы, скобки и дефисы.
    contactPhone: String(b.contactPhone ?? "")
      .replace(/[^\d+()\s-]/g, "")
      .trim()
      .slice(0, 30),
    // Ссылка для отзывов: только https (Яндекс Карты, 2ГИС и т.п.), иначе пусто.
    reviewUrl: toHttpsUrl(b.reviewUrl),
  };

  try {
    await saveSettings(s);
    return Response.json({ ok: true, settings: s });
  } catch (e) {
    console.error("Не удалось сохранить настройки:", e);
    return Response.json({ ok: false, error: "Ошибка базы данных" }, { status: 500 });
  }
}
