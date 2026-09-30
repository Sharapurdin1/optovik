CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY,
	"order_id" text NOT NULL UNIQUE,
	"rating" integer NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"name" text NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_key_hash" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "review_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE;