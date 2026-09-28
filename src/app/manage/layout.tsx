// Общая обёртка панели владельца: меню разделов (только после входа).
// Каждая страница сама проверяет доступ — меню лишь навигация.

import type { Metadata } from "next";
import { isAdmin } from "@/lib/admin-auth";
import { AdminNav } from "@/components/admin/AdminNav";

// Панель владельца — не для поисковиков.
export const metadata: Metadata = {
  title: "Панель владельца",
  robots: { index: false, follow: false },
};

export default async function ManageLayout({ children }: LayoutProps<"/manage">) {
  return (
    <>
      {(await isAdmin()) && <AdminNav />}
      {children}
    </>
  );
}
