import {
  EngagementClass,
  StrategyInsights,
  toText,
} from "./analyticsUtils";

type AnalyticsStrategiesProps = {
  insights: StrategyInsights;
};

const classLabels: EngagementClass[] = ["Low", "Medium", "High"];

function getRelationshipValue(value: number | null) {
  return value === null ? "Need 2+ varied rows" : value.toFixed(2);
}

export default function AnalyticsStrategies({
  insights,
}: AnalyticsStrategiesProps) {
  return (
    <div className="analytics-panel-stack">
      <section className="portal-panel">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">Data Science Strategies</p>
            <h2 className="portal-section-title">Computed strategy outputs</h2>
          </div>
          <span className="portal-chip">Client-side strategy layer</span>
        </div>

        <div className="analytics-strategy-grid">
          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">1. Descriptive Analytics</div>
            <div className="analytics-kpi-grid">
              <div>
                <span>Total posts</span>
                <strong>{insights.totalPosts}</strong>
              </div>
              <div>
                <span>Average score</span>
                <strong>{insights.averageScore}</strong>
              </div>
            </div>
            <ul className="analytics-detail-list">
              <li>Best post: {insights.topPost?.post_id || "No row yet"}</li>
              <li>Best subject: {insights.bestSubject?.[0] || "No subject yet"}</li>
              <li>Best hashtag: {insights.bestHashtag?.[0] || "No hashtag yet"}</li>
              <li>
                Best posting time: {insights.bestPostingTime?.[0] || "No time yet"}
              </li>
            </ul>
          </article>

          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">2. Feature Engineering</div>
            <p className="portal-insight-text">
              Each normalized row receives model-ready derived fields.
            </p>
            <div className="portal-list-items">
              {[
                "weekday",
                "hour",
                "hashtag_count",
                "link_count",
                "text_length",
                "has_link",
                "has_image",
                "engagement_class",
              ].map((feature) => (
                <span className="portal-chip" key={feature}>
                  {feature}
                </span>
              ))}
            </div>
          </article>

          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">3. Engagement Scoring</div>
            <div className="analytics-formula">
              ranking_score_public = reactions + comments * 2 + reposts * 3
            </div>
            <p className="portal-insight-text">
              Scoring stays on visible public engagement until company analytics
              export metrics are available.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">
              4. Correlation / Relationship Analysis
            </div>
            <p className="portal-insight-text">
              Numeric Pearson correlations show direction and strength for the
              active rows. Small samples are exploratory.
            </p>
            <div className="analytics-relationship-grid">
              {insights.relationships.map((relationship) => (
                <div className="analytics-relationship" key={relationship.label}>
                  <span>{relationship.label}</span>
                  <strong>{getRelationshipValue(relationship.value)}</strong>
                  <small>{relationship.note}</small>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">5. Classification Strategy</div>
            <p className="portal-insight-text">
              This resembles a logistic classification setup without adding a
              heavy ML model yet.
            </p>
            <div className="analytics-classifier-layout">
              <div>
                <span className="analytics-source-label">Feature list</span>
                <p className="portal-insight-text">
                  hour, hashtag_count, link_count, text_length, has_link,
                  has_image
                </p>
              </div>
              <div>
                <span className="analytics-source-label">Target variable</span>
                <p className="portal-insight-text">engagement_class</p>
              </div>
            </div>
            <div className="analytics-class-distribution">
              {classLabels.map((label) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{insights.classDistribution[label]}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="portal-insight-card analytics-strategy-card">
            <div className="analytics-card-title">6. Social Media Strategy Rules</div>
            <ul className="analytics-detail-list">
              <li>Best time window: {insights.ruleInsights.bestTimeWindow}</li>
              <li>Best subject type: {insights.ruleInsights.bestSubjectType}</li>
              <li>Best hashtag pattern: {insights.ruleInsights.bestHashtagPattern}</li>
              <li>Best post type: {insights.ruleInsights.bestPostType}</li>
              <li>Best visual style: {insights.ruleInsights.bestVisualStyle}</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="portal-panel">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">Derived Feature Preview</p>
            <h2 className="portal-section-title">Rows prepared for strategy work</h2>
          </div>
        </div>

        <div className="analytics-feature-table-wrap">
          <table className="analytics-feature-table">
            <thead>
              <tr>
                <th>post_id</th>
                <th>weekday</th>
                <th>hour</th>
                <th>hashtag_count</th>
                <th>link_count</th>
                <th>text_length</th>
                <th>has_link</th>
                <th>has_image</th>
                <th>engagement_class</th>
              </tr>
            </thead>
            <tbody>
              {insights.features.map((feature, index) => (
                <tr key={`${feature.row.post_id || "feature"}-${index}`}>
                  <td>{toText(feature.row.post_id) || "No ID"}</td>
                  <td>{feature.weekday}</td>
                  <td>{feature.hour ?? ""}</td>
                  <td>{feature.hashtag_count}</td>
                  <td>{feature.link_count}</td>
                  <td>{feature.text_length}</td>
                  <td>{feature.has_link ? "Yes" : "No"}</td>
                  <td>{feature.has_image ? "Yes" : "No"}</td>
                  <td>{feature.engagement_class}</td>
                </tr>
              ))}
              {!insights.features.length ? (
                <tr>
                  <td colSpan={9}>No rows are available for feature engineering.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
