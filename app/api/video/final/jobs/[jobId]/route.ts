import { NextResponse } from "next/server";

import { cancelFinalVideoJob, getFinalVideoJob } from "../../jobStore";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getFinalVideoJob(jobId);

  if (!job) {
    return NextResponse.json({ message: "Video generation job was not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    percent: job.percent,
    elapsedSeconds: job.elapsedSeconds,
    totalSeconds: job.totalSeconds,
    wallElapsedSeconds: Math.max(
      0,
      Math.floor((Date.now() - job.createdAt) / 1000),
    ),
    error: job.error,
    resultUrl:
      job.status === "completed"
        ? `/api/video/final/jobs/${job.id}/download`
        : undefined,
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = cancelFinalVideoJob(jobId);

  if (!job) {
    return NextResponse.json({ message: "Video generation job was not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    status: job.status,
    percent: job.percent,
    elapsedSeconds: job.elapsedSeconds,
    totalSeconds: job.totalSeconds,
    wallElapsedSeconds: Math.max(
      0,
      Math.floor((Date.now() - job.createdAt) / 1000),
    ),
    error: job.error,
  });
}
