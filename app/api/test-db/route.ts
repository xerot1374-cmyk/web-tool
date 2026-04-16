import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await prisma.user.upsert({
    where: {
      email: "test@example.com",
    },
    update: {
      name: "Shahrzad",
      role: "user",
    },
    create: {
      name: "Shahrzad",
      email: "test@example.com",
      passwordHash: "hashed-password-demo",
      role: "user",
    },
  });

  return NextResponse.json(user);
}
