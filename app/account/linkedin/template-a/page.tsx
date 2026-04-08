import { cookies } from "next/headers";
import TemplateAClientEntry from "./TemplateAClientEntry";

export default async function TemplateAPageServer() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;
  const user = raw ? JSON.parse(raw) : null;

  return <TemplateAClientEntry sessionUser={user} />;
}
