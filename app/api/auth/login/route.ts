import { NextResponse } from "next/server";
import { demoUsers } from "@/app/demoUsers";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = body?.username?.trim();
  const password = body?.password;

  const user = demoUsers.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return NextResponse.json({ ok: false, message: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
res.cookies.set(
  "session_user",
  JSON.stringify({
    name: user.name,
    role: user.role,
    profileImage: user.avatar && user.avatar.length > 0 ? user.avatar : "/profile.jpg",
  }),
  { httpOnly: true, path: "/" }
);


  return res;
}
