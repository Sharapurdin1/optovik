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
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Каталог (ведётся в админке /manage)
// ---------------------------------------------------------------------------

// Категория товаров.
export const categories = pgTable("categories", {
  id: text("id").primaryKey(), // короткий идентификатор, например "dairy"
  title: text("title").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Товар.
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(), // он же хранится в корзинах покупателей
    title: text("title").notNull(),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    price: integer("price").notNull(), // ₽, целые
    oldPrice: integer("old_price"), // зачёркнутая цена (скидка)
    unit: text("unit").notNull().default("шт"), // «кг», «1 л», «10 шт»…
    emoji: text("emoji").notNull().default("📦"), // запасная «картинка», пока нет фото
    description: text("description").notNull().default(""),
    sku: text("sku"), // артикул (необязательно)
    hit: boolean("hit").notNull().default(false),
    active: boolean("active").notNull().default(true), // показывать в магазине
    // Остаток в единицах продажи. null — остаток не ведётся (товар всегда в наличии).
    stock: integer("stock"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("products_category_idx").on(t.categoryId),
    uniqueIndex("products_sku_idx").on(t.sku),
  ]
);

// Фото товара (сами файлы — в S3, здесь только ключ объекта).
export const productImages = pgTable(
  "product_images",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    key: text("key").notNull(), // путь в бакете: products/<uuid>.webp
    sortOrder: integer("sort_order").notNull().default(0), // 0 — главное фото
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId)]
);

// Журнал движения остатков: каждое изменение склада — отдельная строка.
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(), // +приход / −расход
    balanceAfter: integer("balance_after").notNull(), // остаток после операции
    // Приход / Продажа / Списание / Корректировка / Возврат
    reason: text("reason").notNull(),
    orderId: text("order_id"), // для продаж и возвратов
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("stock_movements_product_idx").on(t.productId),
    index("stock_movements_created_idx").on(t.createdAt),
  ]
);

// ---------------------------------------------------------------------------
// Заказы, клиенты, служебное
// ---------------------------------------------------------------------------

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

    status: text("status").notNull().default("Принят"), // Принят / Собираем / В пути / Доставлен / Отменён
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
    // Ссылка на товар каталога (null, если товар потом удалили).
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    unit: text("unit").notNull(),
    price: integer("price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [index("order_items_order_id_idx").on(t.orderId)]
);
