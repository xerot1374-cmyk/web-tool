import { requireCurrentUser } from "@/app/lib/currentUser";
import { prisma } from "@/lib/prisma";
import TemplateAClientEntry from "./TemplateAClientEntry";
import type { TemplateADraftPayload } from "./lib/templateA.types";
import PortalNav from "../../PortalNav";

const TEMPLATE_KEY = "linkedin-template-a";

export default async function TemplateAPageServer() {
  const user = await requireCurrentUser();
  const draft = await prisma.templateDraft.findFirst({
    where: {
      userId: user.id,
      templateKey: TEMPLATE_KEY,
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper portal-wrapper--editor">
        <PortalNav isAuthenticated isAdmin={user.isAdmin} />
        <TemplateAClientEntry
          sessionUser={user}
          initialDraft={
            draft
              ? {
                  id: draft.id,
                  name: draft.name,
                  payload: draft.payload as TemplateADraftPayload,
                  createdAt: draft.createdAt.toISOString(),
                  updatedAt: draft.updatedAt.toISOString(),
                }
              : null
          }
        />
      </div>
    </main>
  );
}
