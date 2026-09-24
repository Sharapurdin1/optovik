// Описание таблиц базы данных (Drizzle + PostgreSQL).
//
// Здесь сказано, ЧТО и в каком виде хранится. Изменили схему — создайте
// миграцию: `npm run db:generate` (появится файл в папке drizzle/).
// Миграции применяются автоматически при старте сервера (instrumentation.ts).

import {
  pgTable,
  text,
  integer,
  bigint,
  boolean,
  serial,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

// Заказ покупателя.
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(), // тот же id, что видит покупатель
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    // Покупатель и доставка
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    address: text("address").notNull(), // полный адрес одной строкой
    street: text("street"), // «улица и дом» отдельно — пригодится для маршрута
    payment: text("payment").notNull(),
    comment: text("comment").notNull().default(""),

    // Суммы (в рублях, целые)
    itemsTotal: integer("items_total").notNull(),
    deliveryFee: integer("delivery_fee").notNull(),
    total: integer("total").notNull(),

    status: text("status").notNull().default("Принят"), // Принят / Собираем / В пути / Доставлен
  },
  (t) => [index("orders_created_at_idx").on(t.createdAt)]
);

// Аккаунт клиента (регистрируется при первом входе по телефону).
export const customers = pgTable("customers", {
  phone: text("phone").primaryKey(), // +7XXXXXXXXXX
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Одноразовый код подтверждения для входа (один активный на телефон).
export const authCodes = pgTable("auth_codes", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(), // время истечения, unix-мс
  attempts: integer("attempts").notNull().default(0),
});

// Настройки магазина (одна строка, id=1). Меняются владельцем в /manage.
export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  acceptingOrders: boolean("accepting_orders").notNull().default(true),
  workFrom: text("work_from").notNull().default("09:00"),
  workTo: text("work_to").notNull().default("21:00"),
  minOrder: integer("min_order").notNull().default(0), // мин. заказ, ₽
  deliveryFee: integer("delivery_fee").notNull().default(200),
  freeDeliveryFrom: integer("free_delivery_from").notNull().default(2000),
});

// Счётчики частоты запросов (антиспам / защита СМС-баланса).
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(), // например "code:phone:+7999..."
  count: integer("count").notNull().default(0),
  windowStart: bigint("window_start", { mode: "number" }).notNull(), // начало окна, unix-мс
});

// Одна позиция внутри заказа.
export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    unit: text("unit").notNull(),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)]
);
