import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = req.cookies.get("session")?.value;

  // Only these paths are public.
  const publicPaths = [
    "/",
    "/login",
    "/api/auth/login",
    "/api/auth/logout",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // If there is no session and the path is not public, redirect to login.
  // if (!session && !isPublic) {
  //   return NextResponse.redirect(new URL("/login", req.url));
  // }

  // If there is a session and the user visits login, redirect to account.
  // if (session && pathname === "/login") {
  //   return NextResponse.redirect(new URL("/account", req.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
