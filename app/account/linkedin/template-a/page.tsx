import { requireCurrentUser } from "@/app/lib/currentUser";
import TemplateAClientEntry from "./TemplateAClientEntry";
import PortalNav from "../../PortalNav";

export default async function TemplateAPageServer() {
  const user = await requireCurrentUser();

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper portal-wrapper--editor">
        <PortalNav isAuthenticated isAdmin={user.isAdmin} />
        <TemplateAClientEntry sessionUser={user} />
      </div>
    </main>
  );
}
