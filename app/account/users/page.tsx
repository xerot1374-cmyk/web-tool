import Link from "next/link";
import { requireAdminUser } from "@/app/lib/currentUser";
import AdminUsersManager from "./AdminUsersManager";
import PortalNav from "../PortalNav";
import { getAdminUserNames, isAdminUser } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";

export default async function UserAdminPage() {
  const currentUser = await requireAdminUser();
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isAdmin: true,
      isBlocked: true,
      createdAt: true,
    },
  });

  const adminUsers = users.map((user) => ({
    ...user,
    isAdmin: isAdminUser(user),
    createdAt: user.createdAt.toISOString(),
  }));

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <PortalNav isAuthenticated isAdmin={currentUser.isAdmin} />

        <div className="portal-header-row">
          <div>
            <p className="portal-eyebrow">Administration</p>
            <h1 className="main-heading portal-heading">Manage user accounts</h1>
            <p className="description portal-description">
              Admins can block, unblock, or permanently delete accounts from here.
            </p>
            <p className="description portal-description" style={{ marginTop: 12 }}>
              Current configured admins: {getAdminUserNames().join(", ")}
            </p>
          </div>

          <Link href="/account" className="portal-back-link">
            Back to portal
          </Link>
        </div>

        <AdminUsersManager currentUserId={currentUser.id} initialUsers={adminUsers} />
      </div>
    </main>
  );
}
