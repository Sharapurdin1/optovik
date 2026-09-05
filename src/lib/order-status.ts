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

// Цвет плашки статуса (используется и у владельца, и у клиента).
export const STATUS_STYLE: Record<string, string> = {
  Принят: "bg-neutral-100 text-neutral-700",
  Собираем: "bg-amber-50 text-amber-700",
  "В пути": "bg-blue-50 text-blue-700",
  Доставлен: "bg-emerald-50 text-emerald-700",
};
