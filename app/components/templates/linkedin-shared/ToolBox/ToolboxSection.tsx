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
    <section className="tb__section">
      {collapsible ? (
        <div
          className="tb__sectionHeader"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen((prev) => !prev);
            }
          }}
        >
          <div className="tb__sectionTitleCopy">
            <span>{title}</span>
            {/*<span className="tb__sectionMeta">{meta}</span>*/}
          </div>
          <span
            className={`tb__sectionToggleIcon${
              open ? " tb__sectionToggleIcon--open" : ""
            }`}
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      ) : (
        <div className="tb__sectionTitle">
          <div className="tb__sectionTitleCopy">
            <span>{title}</span>
            {/*<span className="tb__sectionMeta">{meta}</span>*/}
          </div>
        </div>
      )}
      {!collapsible || open ? children : null}
    </section>
  );
}
