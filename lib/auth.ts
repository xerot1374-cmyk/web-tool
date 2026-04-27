import { randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { NextResponse } from "next/server";

const scrypt = promisify(scryptCallback);
const DEFAULT_PROFILE_IMAGE = "/profile.jpg";

export type SessionUser = {
  email: string;
  name: string;
  role: string;
  profileImage: string;
  isAdmin: boolean;
};

function getSessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(typeof maxAge === "number" ? { maxAge } : {}),
  };
}

export function getProfileImage(profileImage?: string | null) {
  return profileImage && profileImage.length > 0 ? profileImage : DEFAULT_PROFILE_IMAGE;
}

export async function hashPassword(password: string) {
  const salt = randomUUID();
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string) {
  const [salt, hashedPassword] = storedHash.split(":");

  if (!salt || !hashedPassword) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  const storedKey = Buffer.from(hashedPassword, "hex");

  if (storedKey.length !== derivedKey.length) {
    return false;
  }

  return timingSafeEqual(storedKey, derivedKey);
}

export function setSessionCookie(res: NextResponse, user: SessionUser) {
  res.cookies.set(
    "session_user",
    JSON.stringify({
      email: user.email,
      name: user.name,
      role: user.role,
      profileImage: getProfileImage(user.profileImage),
      isAdmin: user.isAdmin,
    }),
    getSessionCookieOptions(60 * 60 * 24 * 7)
  );
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set("session_user", "", getSessionCookieOptions(0));
}
