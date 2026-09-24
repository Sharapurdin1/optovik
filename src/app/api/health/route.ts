// GET /api/health — жив ли сервер и доступна ли база.
// Используется healthcheck'ом Docker и внешним мониторингом доступности.

import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true });
  } catch (e) {
    console.error("healthcheck: база недоступна:", e);
    return Response.json({ ok: false, error: "db" }, { status: 503 });
  }
}
