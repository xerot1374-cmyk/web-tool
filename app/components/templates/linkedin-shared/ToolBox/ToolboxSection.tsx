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
  meta: _meta,
  children,
  collapsible = false,
  defaultOpen = false,
}: ToolboxSectionProps) {
  void _meta;
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={`tb__section${
        collapsible && !open ? " tb__section--collapsed" : ""
      }`}
    >
      <div className="tb__sectionTitle">
        <div className="tb__sectionTitleCopy">
          <span>{title}</span>
          {/*<span className="tb__sectionMeta">{meta}</span>*/}
        </div>
        {collapsible ? (
          <button
            type="button"
            className="tb__sectionHeader"
            aria-expanded={open}
            aria-label={`${open ? "Hide" : "Show"} ${title} section`}
            onClick={() => setOpen((prev) => !prev)}
          >
            <span
              className={`tb__sectionToggleIcon${
                open ? " tb__sectionToggleIcon--open" : ""
              }`}
              aria-hidden="true"
            >
              ▾
            </span>
          </button>
        ) : null}
      </div>
      {!collapsible || open ? children : null}
    </section>
  );
}
