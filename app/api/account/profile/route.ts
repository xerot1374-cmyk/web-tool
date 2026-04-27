import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { clearSessionCookie, getProfileImage, hashPassword, setSessionCookie } from "@/lib/auth";
import { isConfiguredAdminName } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";
import { getTeamEmailRejectedMessage, isAllowedTeamEmail } from "@/lib/teamEmail";

export const runtime = "nodejs";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "profiles");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

async function uploadProfileImage(file: File) {
  await mkdir(uploadDirectory, { recursive: true });

  const extension = path.extname(file.name) || ".bin";
  const baseName = sanitizeFileName(path.basename(file.name, extension));
  const fileName = `${randomUUID()}-${baseName}${extension}`;
  const filePath = path.join(uploadDirectory, fileName);
  const bytes = await file.arrayBuffer();

  await writeFile(filePath, Buffer.from(bytes));

  return `/uploads/profiles/${fileName}`;
}

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const currentEmail = formData.get("currentEmail")?.toString().trim().toLowerCase() ?? "";
  const name = formData.get("name")?.toString().trim() ?? "";
  const role = formData.get("role")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const image = formData.get("profileImage");

  if (!currentEmail || !name || !role || !email) {
    return NextResponse.json(
      { message: "Name, role, and email are required" },
      { status: 400 }
    );
  }

  if (!isAllowedTeamEmail(email)) {
    return NextResponse.json(
      { message: getTeamEmailRejectedMessage() },
      { status: 403 }
    );
  }

  if (password && password.length < 8) {
    return NextResponse.json(
      { message: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: currentEmail } });

  if (!existingUser) {
    const res = NextResponse.json({ message: "Session user not found" }, { status: 404 });
    clearSessionCookie(res);
    return res;
  }

  if (existingUser.isBlocked) {
    const res = NextResponse.json(
      { message: "Your account has been blocked. Please contact an administrator." },
      { status: 403 }
    );
    clearSessionCookie(res);
    return res;
  }

  if (email !== currentEmail) {
    const emailOwner = await prisma.user.findUnique({ where: { email } });
    if (emailOwner && emailOwner.id !== existingUser.id) {
      return NextResponse.json({ message: "Email is already registered" }, { status: 409 });
    }
  }

  let profileImage = existingUser.profileImage;

  if (image instanceof File && image.size > 0) {
    profileImage = await uploadProfileImage(image);
  }

  const updatedUser = await prisma.user.update({
    where: { id: existingUser.id },
    data: {
      name,
      role,
      email,
      isAdmin: existingUser.isAdmin || isConfiguredAdminName(existingUser.name),
      profileImage,
      ...(password ? { passwordHash: await hashPassword(password) } : {}),
    },
  });

  const res = NextResponse.json({
    ok: true,
    user: {
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      profileImage: getProfileImage(updatedUser.profileImage),
    },
  });

  setSessionCookie(res, {
    email: updatedUser.email,
    name: updatedUser.name,
    role: updatedUser.role,
    profileImage: getProfileImage(updatedUser.profileImage),
    isAdmin: updatedUser.isAdmin || isConfiguredAdminName(updatedUser.name),
  });

  return res;
}
