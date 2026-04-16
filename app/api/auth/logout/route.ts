import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

function buildLogoutResponse() {
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}

export async function POST() {
  return buildLogoutResponse();
}

export async function GET() {
  return buildLogoutResponse();
}
