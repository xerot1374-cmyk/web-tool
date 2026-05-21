import { AnalyticsPlatform } from "./analyticsUtils";

type AnalyticsPlatformTabsProps = {
  activePlatform: AnalyticsPlatform;
  onChange: (platform: AnalyticsPlatform) => void;
};

export default function AnalyticsPlatformTabs({
  activePlatform,
  onChange,
}: AnalyticsPlatformTabsProps) {
  return (
    <div className="analytics-tabs" role="tablist" aria-label="Platform">
      {(["linkedin", "instagram"] as const).map((platform) => (
        <button
          aria-selected={activePlatform === platform}
          className={`analytics-tab${activePlatform === platform ? " analytics-tab--active" : ""}`}
          key={platform}
          onClick={() => onChange(platform)}
          role="tab"
          type="button"
        >
          {platform === "linkedin" ? "LinkedIn" : "Instagram"}
        </button>
      ))}
    </div>
  );
}
