// Описание таблиц базы данных (Drizzle + SQLite).
//
// Здесь сказано, ЧТО и в каком виде хранится. Пока база — это файл
// data/optovik.db на вашем компьютере. Когда будем выкладывать сайт,
// тот же код переедет в облачную базу почти без изменений.

import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Заказ покупателя.
export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(), // тот же id, что видит покупатель
  createdAt: text("created_at").notNull(), // ISO-дата

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
});

// Аккаунт клиента (регистрируется при первом входе по телефону).
export const customers = sqliteTable("customers", {
  phone: text("phone").primaryKey(), // +7XXXXXXXXXX
  name: text("name"),
  createdAt: text("created_at").notNull(),
});

// Одноразовый код подтверждения для входа (один активный на телефон).
export const authCodes = sqliteTable("auth_codes", {
  phone: text("phone").primaryKey(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at").notNull(), // время истечения, unix-мс
  attempts: integer("attempts").notNull().default(0),
});

// Счётчики частоты запросов (антиспам / защита СМС-баланса).
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(), // например "code:phone:+7999..."
  count: integer("count").notNull().default(0),
  windowStart: integer("window_start").notNull(), // начало окна, unix-мс
});

// Одна позиция внутри заказа.
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  unit: text("unit").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").notNull(),
});
