import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const session = req.cookies.get("session")?.value;

  // فقط اینا public هستن
  const publicPaths = [
    "/",
    "/login",
    "/api/auth/login",
    "/api/auth/logout",
  ];

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  // اگر session نداره و public نیست → بره login
  // if (!session && !isPublic) {
   //  return NextResponse.redirect(new URL("/login", req.url));
  // }

  // اگر session داره و رفت login → بره account
  // if (session && pathname === "/login") {
  //   return NextResponse.redirect(new URL("/account", req.url));
 // }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
