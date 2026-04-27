import { cookies } from "next/headers";

export type SessionUser = {
  email: string;
  name: string;
  role: string;
  profileImage: string;
  isAdmin?: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;

  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}
