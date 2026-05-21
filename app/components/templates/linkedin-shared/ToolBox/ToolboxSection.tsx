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
      {collapsible ? (
        <div
          className="tb__sectionTitle tb__sectionTitle--toggle"
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} ${title} section`}
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
          <div className="tb__sectionHeader" aria-hidden="true">
            <span
              className={`tb__sectionToggleIcon${
                open ? " tb__sectionToggleIcon--open" : ""
              }`}
              aria-hidden="true"
            >
              <svg
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </div>
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
