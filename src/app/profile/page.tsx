import type { Metadata } from "next";
import { ProfileView } from "@/components/ProfileView";

export const metadata: Metadata = { title: "Профиль" };

export default function ProfilePage() {
  return <ProfileView />;
}
