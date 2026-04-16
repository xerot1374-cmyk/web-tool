import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getProfileImage, hashPassword, setSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const uploadDirectory = path.join(process.cwd(), "public", "uploads", "profiles");

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request) {
  const formData = await req.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const name = formData.get("name")?.toString().trim() ?? "";
  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const password = formData.get("password")?.toString() ?? "";
  const image = formData.get("profileImage");

  if (!name || !email || !password) {
    return NextResponse.json(
      { message: "Name, email, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { message: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    return NextResponse.json({ message: "Email is already registered" }, { status: 409 });
  }

  let profileImage: string | null = null;

  if (image instanceof File && image.size > 0) {
    await mkdir(uploadDirectory, { recursive: true });

    const extension = path.extname(image.name) || ".bin";
    const baseName = sanitizeFileName(path.basename(image.name, extension));
    const fileName = `${randomUUID()}-${baseName}${extension}`;
    const filePath = path.join(uploadDirectory, fileName);
    const bytes = await image.arrayBuffer();

    await writeFile(filePath, Buffer.from(bytes));
    profileImage = `/uploads/profiles/${fileName}`;
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      profileImage,
    },
  });

  const res = NextResponse.json({ ok: true });
  setSessionCookie(res, {
    name: user.name,
    role: user.role,
    profileImage: getProfileImage(user.profileImage),
  });

  return res;
}
