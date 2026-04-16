import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const sessionUser = req.cookies.get("session_user")?.value;
  const isPublicPath = publicPaths.some((path) =>
    path === "/" ? pathname === path : pathname.startsWith(path)
  );
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isProtectedPath = pathname.startsWith("/account");

  if (!sessionUser && isProtectedPath) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (sessionUser && isAuthPage) {
    return NextResponse.redirect(new URL("/account", req.url));
  }

  if (!isPublicPath && !isProtectedPath) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
