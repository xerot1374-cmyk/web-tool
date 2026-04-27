import { redirect } from "next/navigation";
import { getSessionUser } from "@/app/lib/userSession";
import { isAdminUser } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";

export async function getCurrentUserRecord() {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.email) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email },
  });

  if (!user || user.isBlocked) {
    return null;
  }

  return {
    ...user,
    isAdmin: isAdminUser(user),
  };
}

export async function requireCurrentUser() {
  const user = await getCurrentUserRecord();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdminUser() {
  const user = await requireCurrentUser();

  if (!user.isAdmin) {
    redirect("/account");
  }

  return user;
}
