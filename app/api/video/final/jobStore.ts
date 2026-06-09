import crypto from "crypto";
import fs from "fs/promises";

export type FinalVideoJobStatus =
  | "queued"
  | "rendering"
  | "completed"
  | "failed"
  | "canceled";

export type FinalVideoJob = {
  id: string;
  status: FinalVideoJobStatus;
  percent: number;
  elapsedSeconds: number;
  totalSeconds: number;
  error?: string;
  resultPath?: string;
  cancel?: () => void;
  tmpDir: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
};

const JOB_TTL_MS = 60 * 60 * 1000;

type FinalVideoJobGlobal = typeof globalThis & {
  __finalVideoJobs?: Map<string, FinalVideoJob>;
};

function getJobs() {
  const globalStore = globalThis as FinalVideoJobGlobal;
  globalStore.__finalVideoJobs ??= new Map<string, FinalVideoJob>();
  return globalStore.__finalVideoJobs;
}

function cleanupExpiredJobs() {
  const now = Date.now();
  for (const [jobId, job] of getJobs()) {
    if (job.expiresAt > now) continue;

    getJobs().delete(jobId);
    void fs.rm(job.tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export function createFinalVideoJob(tmpDir: string, totalSeconds: number) {
  cleanupExpiredJobs();

  const now = Date.now();
  const job: FinalVideoJob = {
    id: crypto.randomUUID(),
    status: "queued",
    percent: 0,
    elapsedSeconds: 0,
    totalSeconds,
    tmpDir,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + JOB_TTL_MS,
  };

  getJobs().set(job.id, job);
  return job;
}

export function getFinalVideoJob(jobId: string) {
  cleanupExpiredJobs();
  return getJobs().get(jobId) ?? null;
}

export function updateFinalVideoJob(
  jobId: string,
  patch: Partial<
    Pick<
      FinalVideoJob,
      | "status"
      | "percent"
      | "elapsedSeconds"
      | "error"
      | "resultPath"
      | "cancel"
    >
  >,
) {
  const job = getJobs().get(jobId);
  if (!job) return null;

  Object.assign(job, patch, {
    updatedAt: Date.now(),
    expiresAt: Date.now() + JOB_TTL_MS,
  });
  return job;
}

export function cancelFinalVideoJob(jobId: string) {
  const job = getFinalVideoJob(jobId);
  if (!job) return null;
  if (job.status === "completed" || job.status === "failed") return job;

  job.cancel?.();
  return updateFinalVideoJob(jobId, {
    status: "canceled",
    error: "Video generation canceled.",
    cancel: undefined,
  });
}
