export type AnalyticsSection = "data" | "strategies" | "visual";

type AnalyticsSectionTabsProps = {
  activeSection: AnalyticsSection;
  onChange: (section: AnalyticsSection) => void;
};

const sections: { key: AnalyticsSection; label: string }[] = [
  { key: "data", label: "Uploaded Data / All Activities" },
  { key: "strategies", label: "Data Science Strategies" },
  { key: "visual", label: "Visual Result + AI Assistant" },
];

export default function AnalyticsSectionTabs({
  activeSection,
  onChange,
}: AnalyticsSectionTabsProps) {
  return (
    <div
      className="analytics-tabs analytics-tabs--sections"
      role="tablist"
      aria-label="Analytics view"
    >
      {sections.map((section) => (
        <button
          aria-selected={activeSection === section.key}
          className={`analytics-tab${activeSection === section.key ? " analytics-tab--active" : ""}`}
          key={section.key}
          onClick={() => onChange(section.key)}
          role="tab"
          type="button"
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
