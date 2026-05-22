"use client";

import dynamic from "next/dynamic";
import type { TemplateADraft } from "./lib/templateA.types";

type SessionUser = {
  name: string;
  role: string;
  profileImage: string | null;
};

type Props = {
  sessionUser: SessionUser | null;
  initialDraft: TemplateADraft | null;
};

const TemplateAClient = dynamic(() => import("./TemplateAClient"), {
  ssr: false,
});

export default function TemplateAClientEntry(props: Props) {
  return <TemplateAClient {...props} />;
}
