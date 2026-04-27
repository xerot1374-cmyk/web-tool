import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/app/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/app/lib/userSession";
import { getProfileImage } from "@/lib/auth";
import PortalNav from "../PortalNav";
import ProfileForm from "./ProfileForm";

export default async function ProfilePage() {
  const currentUser = await requireCurrentUser();
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
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <PortalNav isAuthenticated isAdmin={currentUser.isAdmin} />
        <ProfileForm
          initialUser={{
            email: user.email,
            name: user.name,
            role: user.role,
            profileImage: getProfileImage(user.profileImage),
          }}
        />
      </div>
    </main>
  );
}
