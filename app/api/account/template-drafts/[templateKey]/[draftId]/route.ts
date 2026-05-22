import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/currentUser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ templateKey: string; draftId: string }>;
};

async function findUserDraft(context: RouteContext) {
  const user = await requireCurrentUser();
  const { draftId, templateKey } = await context.params;

  if (!draftId.trim() || !templateKey.trim()) {
    return { user, draft: null };
  }

  const draft = await prisma.templateDraft.findFirst({
    where: {
      id: draftId,
      templateKey,
      userId: user.id,
    },
  });

  return { user, draft };
}

function draftNotFound() {
  return NextResponse.json({ message: "Draft not found" }, { status: 404 });
}

function toDraftResponse(draft: {
  id: string;
  name: string;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: draft.id,
    name: draft.name,
    payload: draft.payload,
    createdAt: draft.createdAt.toISOString(),
    updatedAt: draft.updatedAt.toISOString(),
  };
}

export async function GET(_req: Request, context: RouteContext) {
  const { draft } = await findUserDraft(context);

  if (!draft) {
    return draftNotFound();
  }

  return NextResponse.json({
    ok: true,
    draft: toDraftResponse(draft),
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const { draft } = await findUserDraft(context);

  if (!draft) {
    return draftNotFound();
  }

  const body = (await req.json().catch(() => null)) as
    | { payload?: unknown }
    | null;

  if (!body || body.payload == null || typeof body.payload !== "object") {
    return NextResponse.json(
      { message: "A draft payload object is required" },
      { status: 400 },
    );
  }

  const updated = await prisma.templateDraft.update({
    where: { id: draft.id },
    data: { payload: body.payload },
  });

  return NextResponse.json({
    ok: true,
    draft: toDraftResponse(updated),
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const { draft } = await findUserDraft(context);

  if (!draft) {
    return draftNotFound();
  }

  const body = (await req.json().catch(() => null)) as
    | { name?: unknown }
    | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";

  if (!name) {
    return NextResponse.json(
      { message: "Draft name is required" },
      { status: 400 },
    );
  }

  const updated = await prisma.templateDraft.update({
    where: { id: draft.id },
    data: { name: name.slice(0, 100) },
  });

  return NextResponse.json({
    ok: true,
    draft: toDraftResponse(updated),
  });
}
