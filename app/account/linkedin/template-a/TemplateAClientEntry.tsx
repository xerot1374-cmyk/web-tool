"use client";

import dynamic from "next/dynamic";

type SessionUser = {
  name: string;
  role: string;
  profileImage: string;
};

type Props = {
  sessionUser: SessionUser | null;
};

const TemplateAClient = dynamic(() => import("./TemplateAClient"), {
  ssr: false,
});

export default function TemplateAClientEntry(props: Props) {
  return <TemplateAClient {...props} />;
}
