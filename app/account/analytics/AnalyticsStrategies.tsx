import { EngagementClass, StrategyInsights, toText } from "./analyticsUtils";

type AnalyticsStrategiesProps = {
  emptyMessage: string;
  insights: StrategyInsights;
  timeFilterLabel: string;
};

const classLabels: EngagementClass[] = ["Low", "Medium", "High"];

function getRelationshipValue(value: number | null) {
  return value === null ? "Need 2+ varied rows" : value.toFixed(2);
}

export default function AnalyticsStrategies({
  emptyMessage,
  insights,
  timeFilterLabel,
}: AnalyticsStrategiesProps) {
  if (!insights.totalPosts) {
    return (
      <section className="portal-panel analytics-empty-panel">
        <p className="portal-eyebrow">Data Science Strategies</p>
        <h2 className="portal-section-title">Strategy view is ready</h2>
        <p className="portal-insight-text">{emptyMessage}</p>
      </section>
    );
  }

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
          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--descriptive">
            <div className="analytics-card-title">1. Descriptive Analytics</div>
            <p className="portal-insight-text">
              Checks totals and the strongest visible post patterns.
            </p>
            <p className="analytics-strategy-fields">
              Fields: score, subject, hashtags, post time
            </p>
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
            <p className="analytics-future-note">
              Future post meaning: start from the post, topic, hashtag, and time
              that already worked best.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--feature">
            <div className="analytics-card-title">2. Feature Engineering</div>
            <p className="portal-insight-text">
              Turns normal post fields into simple features we can compare.
            </p>
            <p className="analytics-strategy-fields">
              Fields: date, time, text, hashtags, links, image URL
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
            <p className="analytics-future-note">
              Future post meaning: these simple clues help compare posts fairly.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--scoring">
            <div className="analytics-card-title">3. Engagement Scoring</div>
            <div className="analytics-formula">
              ranking_score_public = reactions + comments * 2 + reposts * 3
            </div>
            <p className="portal-insight-text">
              Gives visible reactions, comments, and reposts one clear score.
            </p>
            <p className="analytics-strategy-fields">
              Fields: visible reactions, comments, reposts
            </p>
            <p className="analytics-future-note">
              Future post meaning: higher scores highlight ideas worth testing
              again.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--relationship">
            <div className="analytics-card-title">
              4. Correlation / Relationship Analysis
            </div>
            <p className="portal-insight-text">
              Checks whether timing, hashtags, text length, or links move with
              score. Small samples are only directional.
            </p>
            <p className="analytics-strategy-fields">
              Fields: hour, hashtag count, text length, link count, score
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
            <p className="analytics-future-note">
              Future post meaning: treat these signals as hints about timing,
              hashtags, links, and text length.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--classification">
            <div className="analytics-card-title">5. Classification Strategy</div>
            <p className="portal-insight-text">
              Sorts posts into simple performance groups before any heavier
              model is added.
            </p>
            <p className="analytics-strategy-fields">
              Fields: score plus derived post features
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
                <span className="analytics-source-label">
                  Performance group label
                </span>
                <p className="portal-insight-text">
                  engagement_class: Low, Medium, or High
                </p>
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
            <p className="analytics-future-note">
              Future post meaning: aim to move more posts into the High group.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--monthly">
            <div className="analytics-card-title">6. Monthly Trend Analysis</div>
            <p className="portal-insight-text">
              Checks posts, score, reactions, comments, and reposts month by
              month.
            </p>
            <ul className="analytics-detail-list">
              <li>Fields: post_date and visible engagement fields</li>
              <li>Best month: {insights.bestMonth?.monthLabel || "No month yet"}</li>
              <li>
                Weakest month: {insights.weakestMonth?.monthLabel || "No month yet"}
              </li>
            </ul>
            <p className="analytics-future-note">
              Future post meaning: compare stronger months before planning the
              next calendar block.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--time">
            <div className="analytics-card-title">7. Time Filter Analysis</div>
            <p className="portal-insight-text">
              Limits every result to the selected period before comparing posts.
            </p>
            <ul className="analytics-detail-list">
              <li>Current period: {timeFilterLabel}</li>
              <li>Fields: post_date</li>
              <li>Rows in result: {insights.totalPosts}</li>
            </ul>
            <p className="analytics-future-note">
              Future post meaning: compare the period that matters for your next
              campaign or report.
            </p>
          </article>

          <article className="portal-insight-card analytics-strategy-card analytics-strategy-card--recommendation">
            <div className="analytics-card-title">
              8. Rule-based Future Recommendation
            </div>
            <p className="portal-insight-text">
              Combines the strongest time, topic, hashtag, type, and visual
              signals.
            </p>
            <p className="analytics-strategy-fields">
              Fields: all active strategy outputs
            </p>
            <ul className="analytics-detail-list">
              <li>Best time window: {insights.ruleInsights.bestTimeWindow}</li>
              <li>Best subject type: {insights.ruleInsights.bestSubjectType}</li>
              <li>Best hashtag pattern: {insights.ruleInsights.bestHashtagPattern}</li>
              <li>Best post type: {insights.ruleInsights.bestPostType}</li>
              <li>Best visual style: {insights.ruleInsights.bestVisualStyle}</li>
            </ul>
            <p className="analytics-future-note">
              Future post meaning: use the strongest rule set as a practical
              next-post checklist.
            </p>
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
