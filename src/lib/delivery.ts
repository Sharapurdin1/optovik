// Правила доставки — общий код для клиента и сервера (одинаковый расчёт).

export const FREE_DELIVERY_FROM = 2000; // бесплатная доставка от суммы, ₽
export const DELIVERY_FEE = 200; // стоимость доставки, ₽

// Стоимость доставки по сумме товаров.
export function calcDeliveryFee(itemsTotal: number): number {
  return itemsTotal >= FREE_DELIVERY_FROM || itemsTotal === 0
    ? 0
    : DELIVERY_FEE;
}
