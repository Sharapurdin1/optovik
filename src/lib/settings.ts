// Настройки магазина — общий код для сервера и браузера.

export type Settings = {
  acceptingOrders: boolean; // приём заказов вкл/выкл
  workFrom: string; // "HH:MM"
  workTo: string; // "HH:MM"
  minOrder: number; // минимальный заказ, ₽ (0 — без минимума)
  deliveryFee: number; // цена доставки, ₽
  freeDeliveryFrom: number; // бесплатная доставка от суммы, ₽
};

export const DEFAULT_SETTINGS: Settings = {
  acceptingOrders: true,
  workFrom: "09:00",
  workTo: "21:00",
  minOrder: 0,
  deliveryFee: 200,
  freeDeliveryFrom: 2000,
};

// Стоимость доставки по сумме товаров и настройкам.
export function calcDeliveryFee(itemsTotal: number, s: Settings): number {
  if (itemsTotal <= 0) return 0;
  return itemsTotal >= s.freeDeliveryFrom ? 0 : s.deliveryFee;
}

// Открыт ли магазин сейчас (по махачкалинскому времени = МСК, UTC+3).
export function isOpenNow(s: Settings, now: Date = new Date()): boolean {
  if (!s.acceptingOrders) return false;
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now); // "14:35"
  const [h, m] = hm.split(":").map(Number);
  const cur = h * 60 + m;
  const [fh, fm] = s.workFrom.split(":").map(Number);
  const [th, tm] = s.workTo.split(":").map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from === to) return true; // круглосуточно
  if (from < to) return cur >= from && cur < to;
  return cur >= from || cur < to; // смена через полночь
}
