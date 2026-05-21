import { useState, type ReactNode } from "react";

type ToolboxSectionProps = {
  title: string;
  meta: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
};

export default function ToolboxSection({
  title,
  meta,
  children,
  collapsible = false,
  defaultOpen = true,
}: ToolboxSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="tb__section">
      <div className="tb__sectionTitle">
        <div className="tb__sectionTitleCopy">
          <span>{title}</span>
          <span className="tb__sectionMeta">{meta}</span>
        </div>
        {collapsible ? (
          <button
            type="button"
            className="tb__sectionToggle"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {(!collapsible || open) ? children : null}
    </section>
  );
}
