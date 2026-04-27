import { NextResponse } from "next/server";
import { getProfileImage, setSessionCookie, verifyPassword } from "@/lib/auth";
import { isAdminUser } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = body?.email?.trim()?.toLowerCase();
  const password = body?.password;

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, message: "Email and password are required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  if (user.isBlocked) {
    return NextResponse.json(
      { ok: false, message: "Your account has been blocked. Please contact an administrator." },
      { status: 403 }
    );
  }

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, {
    email: user.email,
    name: user.name,
    role: user.role,
    profileImage: getProfileImage(user.profileImage),
    isAdmin: isAdminUser(user),
  });

  return res;
}
