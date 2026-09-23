// POST /api/auth/logout — выход покупателя: чистим серверную сессию
// (и на всякий случай сессию панели владельца).
import { cookies } from "next/headers";
import { clearSession } from "@/lib/session";
import { ADMIN_COOKIE } from "@/lib/admin-auth";

export async function POST() {
  await clearSession();
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.json({ ok: true });
}
