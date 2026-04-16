import { cookies } from "next/headers";
import TemplateAClientEntry from "./TemplateAClientEntry";
import PortalNav from "../../PortalNav";

export default async function TemplateAPageServer() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("session_user")?.value;
  const user = raw ? JSON.parse(raw) : null;

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper portal-wrapper--editor">
        <PortalNav isAuthenticated={Boolean(user)} />
        <TemplateAClientEntry sessionUser={user} />
      </div>
    </main>
  );
}
