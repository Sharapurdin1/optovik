// Общая обёртка панели владельца: меню разделов (только после входа).
// Каждая страница сама проверяет доступ — меню лишь навигация.

import { isAdmin } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function ManageLayout({ children }: LayoutProps<"/manage">) {
  return (
    <>
      {(await isAdmin()) && <AdminNav />}
      {children}
    </>
  );
}
