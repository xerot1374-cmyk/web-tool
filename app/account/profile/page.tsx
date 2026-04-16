import { redirect } from "next/navigation";
import ProfileForm from "./ProfileForm";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/userSession";
import { getProfileImage } from "@/lib/auth";

export default async function ProfilePage() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <ProfileForm
      initialUser={{
        email: user.email,
        name: user.name,
        role: user.role,
        profileImage: getProfileImage(user.profileImage),
      }}
    />
  );
}
