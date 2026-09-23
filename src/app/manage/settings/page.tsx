// Страница настроек магазина (только для владельца).
import { isAdmin } from "@/lib/admin-auth";
import { getSettings } from "@/lib/settings-server";
import { AdminLogin } from "@/components/AdminLogin";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const settings = await getSettings();
  return <SettingsForm initial={settings} />;
}
