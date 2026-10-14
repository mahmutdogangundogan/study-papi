import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";

export default async function MyProfilePage() {
  const user = await requireUser("/profile");
  redirect(`/profile/${user.username}`);
}
