import type { ReactNode } from "react";

type ToolboxSectionProps = {
  title: string;
  meta: string;
  children: ReactNode;
};

export default function ToolboxSection({
  title,
  meta,
  children,
}: ToolboxSectionProps) {
  return (
    <section className="tb__section">
      <div className="tb__sectionTitle">
        <span>{title}</span>
        <span className="tb__sectionMeta">{meta}</span>
      </div>
      {children}
    </section>
  );
}
