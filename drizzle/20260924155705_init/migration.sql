CREATE TABLE "auth_codes" (
	"phone" text PRIMARY KEY,
	"code" text NOT NULL,
	"expires_at" bigint NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"phone" text PRIMARY KEY,
	"name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY,
	"order_id" text NOT NULL,
	"title" text NOT NULL,
	"unit" text NOT NULL,
	"price" integer NOT NULL,
	"quantity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text NOT NULL,
	"street" text,
	"payment" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"items_total" integer NOT NULL,
	"delivery_fee" integer NOT NULL,
	"total" integer NOT NULL,
	"status" text DEFAULT 'Принят' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY,
	"accepting_orders" boolean DEFAULT true NOT NULL,
	"work_from" text DEFAULT '09:00' NOT NULL,
	"work_to" text DEFAULT '21:00' NOT NULL,
	"min_order" integer DEFAULT 0 NOT NULL,
	"delivery_fee" integer DEFAULT 200 NOT NULL,
	"free_delivery_from" integer DEFAULT 2000 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" ("created_at");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;