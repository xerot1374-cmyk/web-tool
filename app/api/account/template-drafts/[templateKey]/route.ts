import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/currentUser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function normalizeTemplateKey(value: string) {
  return value.trim();
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ templateKey: string }> },
) {
  const user = await requireCurrentUser();
  const { templateKey: rawTemplateKey } = await context.params;
  const templateKey = normalizeTemplateKey(rawTemplateKey);

  if (!templateKey) {
    return NextResponse.json(
      { message: "Template key is required" },
      { status: 400 },
    );
  }

  const drafts = await prisma.templateDraft.findMany({
    where: {
      userId: user.id,
      templateKey,
    },
    select: {
      id: true,
      name: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ok: true,
    drafts: drafts.map((draft) => ({
      ...draft,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    })),
  });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ templateKey: string }> },
) {
  const user = await requireCurrentUser();
  const { templateKey: rawTemplateKey } = await context.params;
  const templateKey = normalizeTemplateKey(rawTemplateKey);

  if (!templateKey) {
    return NextResponse.json(
      { message: "Template key is required" },
      { status: 400 },
    );
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

  const draftNumber =
    (await prisma.templateDraft.count({
      where: {
        userId: user.id,
        templateKey,
      },
    })) + 1;

  const draft = await prisma.templateDraft.create({
    data: {
      userId: user.id,
      templateKey,
      name: `Draft ${draftNumber}`,
      payload: body.payload,
    },
  });

  return NextResponse.json({
    ok: true,
    draft: {
      id: draft.id,
      name: draft.name,
      payload: draft.payload,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    },
  });
}
