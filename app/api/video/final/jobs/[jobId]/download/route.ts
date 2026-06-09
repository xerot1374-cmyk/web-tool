import fs from "fs/promises";
import { NextResponse } from "next/server";

import { getFinalVideoJob } from "../../../jobStore";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: RouteContext) {
  const { jobId } = await context.params;
  const job = getFinalVideoJob(jobId);

  if (!job || job.status !== "completed" || !job.resultPath) {
    return NextResponse.json({ message: "Generated video is not ready" }, { status: 404 });
  }

  const out = await fs.readFile(job.resultPath);
  return new NextResponse(out as unknown as BodyInit, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": 'attachment; filename="final.mp4"',
    },
  });
}
