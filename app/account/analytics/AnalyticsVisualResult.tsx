import AnalyticsAssistant from "./AnalyticsAssistant";
import {
  buildDashboardCards,
  EngagementClass,
  StrategyInsights,
} from "./analyticsUtils";

type AnalyticsVisualResultProps = {
  insights: StrategyInsights;
  surfaceLabel: string;
};

const classLabels: EngagementClass[] = ["Low", "Medium", "High"];

export default function AnalyticsVisualResult({
  insights,
  surfaceLabel,
}: AnalyticsVisualResultProps) {
  const dashboardCards = buildDashboardCards(insights);

  return (
    <div className="analytics-panel-stack">
      <section className="portal-panel">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">Visual Result</p>
            <h2 className="portal-section-title">Strategy results</h2>
          </div>
          <span className="portal-chip">{surfaceLabel}</span>
        </div>

        <div className="analytics-kpi-strip">
          <div className="portal-strip-card">
            <span className="portal-strip-label">Posts</span>
            <strong className="portal-strip-value">{insights.totalPosts}</strong>
          </div>
          <div className="portal-strip-card">
            <span className="portal-strip-label">Average score</span>
            <strong className="portal-strip-value">{insights.averageScore}</strong>
          </div>
          <div className="portal-strip-card">
            <span className="portal-strip-label">Top score</span>
            <strong className="portal-strip-value">
              {insights.topPost?.ranking_score_public ?? 0}
            </strong>
          </div>
          <div className="portal-strip-card">
            <span className="portal-strip-label">High class rows</span>
            <strong className="portal-strip-value">
              {insights.classDistribution.High}
            </strong>
          </div>
        </div>

        <div className="analytics-dashboard-grid">
          {dashboardCards.map((card) => (
            <article className="portal-insight-card analytics-card" key={card.title}>
              <div className="analytics-card-title">{card.title}</div>
              <div className="analytics-card-value">{card.value}</div>
              <p className="portal-insight-text">{card.text}</p>
              <div className="portal-list-items">
                {card.items.map((item) => (
                  <span className="portal-chip" key={`${card.title}-${item}`}>
                    {item}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="analytics-visual-lower-grid">
        <div className="portal-panel">
          <div className="analytics-section-heading">
            <div>
              <p className="portal-eyebrow">Engagement Class Distribution</p>
              <h2 className="portal-section-title">Performance classes</h2>
            </div>
          </div>
          <div className="analytics-class-bars">
            {classLabels.map((label) => {
              const count = insights.classDistribution[label];
              const width = insights.totalPosts
                ? `${Math.max((count / insights.totalPosts) * 100, count ? 12 : 0)}%`
                : "0%";

              return (
                <div className="analytics-class-bar" key={label}>
                  <span>{label}</span>
                  <div>
                    <i style={{ width }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            })}
          </div>
        </div>

        <div className="portal-panel analytics-recommendation">
          <p className="portal-eyebrow">Future Recommendation</p>
          <h2 className="portal-section-title">Next post direction</h2>
          <p>{insights.recommendation}</p>
          <div className="portal-list-items">
            <span className="portal-chip">{insights.ruleInsights.bestTimeWindow}</span>
            <span className="portal-chip">{insights.ruleInsights.bestPostType}</span>
            <span className="portal-chip">{insights.ruleInsights.bestVisualStyle}</span>
          </div>
        </div>
      </section>

      <AnalyticsAssistant insights={insights} surfaceLabel={surfaceLabel} />
    </div>
  );
}
