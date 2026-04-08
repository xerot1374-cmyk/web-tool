import { NextResponse } from "next/server";

export async function GET() {
  const res = NextResponse.redirect(new URL("/login", "http://localhost:3000"));
  res.cookies.set("session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
