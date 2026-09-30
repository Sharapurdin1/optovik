// Отзывы покупателей: средняя оценка, недовольные с телефоном, публикация на сайте.
import { isAdmin } from "@/lib/admin-auth";
import { getAllReviews } from "@/lib/reviews";
import { AdminLogin } from "@/components/AdminLogin";
import { ReviewsAdmin } from "@/components/admin/ReviewsAdmin";

export default async function ReviewsPage() {
  if (!(await isAdmin())) return <AdminLogin />;
  const reviews = await getAllReviews();
  return <ReviewsAdmin reviews={reviews} />;
}
