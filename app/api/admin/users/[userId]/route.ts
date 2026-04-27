import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/userSession";
import { isAdminUser } from "@/lib/adminAccess";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const actor = await prisma.user.findUnique({
    where: { email: sessionUser.email },
  });

  if (!actor || actor.isBlocked || !isAdminUser(actor)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;

  if (!action || !["block", "unblock", "delete"].includes(action)) {
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  }

  const { userId } = await context.params;

  if (!userId) {
    return NextResponse.json({ message: "User id is required" }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  if (targetUser.id === actor.id && action !== "unblock") {
    return NextResponse.json(
      { message: "You cannot block or delete your own account." },
      { status: 400 }
    );
  }

  if (action === "delete") {
    await prisma.user.delete({
      where: { id: targetUser.id },
    });

    return NextResponse.json({ ok: true, action });
  }

  await prisma.user.update({
    where: { id: targetUser.id },
    data: { isBlocked: action === "block" },
  });

  return NextResponse.json({ ok: true, action });
}
