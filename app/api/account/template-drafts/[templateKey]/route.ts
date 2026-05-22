import { NextResponse } from "next/server";
import { requireCurrentUser } from "@/app/lib/currentUser";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const DEFAULT_PAGE_SIZE = 5;
const MAX_SEARCH_LENGTH = 100;

function normalizeTemplateKey(value: string) {
  return value.trim();
}

function getPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(
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

  const url = new URL(req.url);
  const page = getPositiveInteger(url.searchParams.get("page"), 1);
  const pageSize = DEFAULT_PAGE_SIZE;
  const search = url.searchParams
    .get("search")
    ?.trim()
    .slice(0, MAX_SEARCH_LENGTH);
  const where = {
    userId: user.id,
    templateKey,
    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive" as const,
          },
        }
      : {}),
  };

  const [drafts, total] = await prisma.$transaction([
    prisma.templateDraft.findMany({
      where,
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.templateDraft.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    drafts: drafts.map((draft) => ({
      ...draft,
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
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
