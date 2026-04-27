import { ReactNode } from "react";
import { requireCurrentUser } from "@/app/lib/currentUser";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  await requireCurrentUser();

  return children;
}
