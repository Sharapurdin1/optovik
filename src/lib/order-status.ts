// Этапы заказа — общий список для сервера и браузера.
// (Отдельный нейтральный файл, чтобы клиентский код не тянул серверный.)

export const ORDER_STATUSES = [
  "Принят",
  "Собираем",
  "В пути",
  "Доставлен",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export function isOrderStatus(v: unknown): v is OrderStatus {
  return (
    typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v)
  );
}
