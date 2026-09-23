// GET /api/auth/me — кто сейчас вошёл (по серверной сессии).
// Клиент вызывает при загрузке, чтобы отобразить реальное состояние входа.
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/session";
import { isOwnerPhone } from "@/lib/auth-server";

export async function GET() {
  const s = await getSession();
  if (!s) return Response.json({ user: null });

  const rows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.phone, s.phone));

  return Response.json({
    user: {
      phone: s.phone,
      name: rows[0]?.name ?? null,
      isOwner: isOwnerPhone(s.phone),
    },
  });
}
