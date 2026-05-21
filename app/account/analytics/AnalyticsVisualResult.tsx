import {
  EngagementClass,
  getHashtags,
  StrategyInsights,
} from "./analyticsUtils";

type AnalyticsVisualResultProps = {
  emptyMessage: string;
  insights: StrategyInsights;
  surfaceLabel: string;
};

type ScoreBar = {
  label: string;
  score: number;
  rows: number;
};

const classLabels: EngagementClass[] = ["Low", "Medium", "High"];

type StrategyTone =
  | "descriptive"
  | "scoring"
  | "feature"
  | "relationship"
  | "classification"
  | "monthly"
  | "recommendation";

function StrategyLabel({
  children,
  tone,
}: {
  children: string;
  tone: StrategyTone;
}) {
  return (
    <span className={`analytics-strategy-label analytics-strategy-label--${tone}`}>
      Strategy: {children}
    </span>
  );
}

function getAverageScoreBars(
  labels: string[],
  getScore: (index: number) => number,
) {
  const totals = new Map<string, { score: number; rows: number }>();

  labels.forEach((label, index) => {
    const value = label.trim();

    if (!value) {
      return;
    }

    const total = totals.get(value) ?? { score: 0, rows: 0 };
    totals.set(value, {
      score: total.score + getScore(index),
      rows: total.rows + 1,
    });
  });

  return [...totals.entries()]
    .map(([label, total]) => ({
      label,
      rows: total.rows,
      score: Math.round(total.score / total.rows),
    }))
    .sort((first, second) => second.score - first.score)
    .slice(0, 4);
}

function getHashtagBars(insights: StrategyInsights) {
  const hashtags: string[] = [];
  const scores: number[] = [];

  insights.rows.forEach((row) => {
    getHashtags([row]).forEach((hashtag) => {
      hashtags.push(hashtag);
      scores.push(row.ranking_score_public);
    });
  });

  return getAverageScoreBars(hashtags, (index) => scores[index]);
}

function getSubjectBars(insights: StrategyInsights) {
  return getAverageScoreBars(
    insights.rows.map((row) => row.subject),
    (index) => insights.rows[index].ranking_score_public,
  );
}

function getHourBars(insights: StrategyInsights) {
  const hourLabels: string[] = [];
  const scores: number[] = [];

  insights.features.forEach((feature) => {
    if (feature.hour !== null) {
      hourLabels.push(`${String(feature.hour).padStart(2, "0")}:00`);
      scores.push(feature.row.ranking_score_public);
    }
  });

  return getAverageScoreBars(hourLabels, (index) => scores[index]);
}

function getPostTypeMix(insights: StrategyInsights) {
  const counts = new Map<string, number>();

  insights.rows.forEach((row) => {
    const postType = row.post_type.trim() || "Other";
    counts.set(postType, (counts.get(postType) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([label, count]) => ({
      count,
      label,
      percent: Math.round((count / insights.totalPosts) * 100),
    }))
    .sort((first, second) => second.count - first.count);
}

function BarDiagram({
  bars,
  emptyText,
}: {
  bars: ScoreBar[];
  emptyText: string;
}) {
  const maxScore = Math.max(...bars.map((bar) => bar.score), 1);

  if (!bars.length) {
    return <p className="portal-insight-text">{emptyText}</p>;
  }

  return (
    <div className="analytics-score-bars">
      {bars.map((bar) => (
        <div className="analytics-score-bar" key={bar.label}>
          <div>
            <span>{bar.label}</span>
            <small>{bar.rows} {bar.rows === 1 ? "post" : "posts"}</small>
          </div>
          <i>
            <b style={{ width: `${Math.max((bar.score / maxScore) * 100, 8)}%` }} />
          </i>
          <strong>{bar.score}</strong>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsVisualResult({
  emptyMessage,
  insights,
  surfaceLabel,
}: AnalyticsVisualResultProps) {
  if (!insights.totalPosts) {
    return (
      <div className="analytics-panel-stack">
        <section className="portal-panel analytics-empty-panel">
          <p className="portal-eyebrow">Visual Result</p>
          <h2 className="portal-section-title">Result view is ready</h2>
          <p className="portal-insight-text">{emptyMessage}</p>
        </section>
      </div>
    );
  }

  const hashtagBars = getHashtagBars(insights);
  const subjectBars = getSubjectBars(insights);
  const hourBars = getHourBars(insights);
  const postTypeMix = getPostTypeMix(insights);
  const leadingPostType = postTypeMix[0];
  const monthlyMaxScore = Math.max(
    ...insights.monthlyTrend.map((month) => month.averageScore),
    1,
  );
  const donutStops = postTypeMix
    .reduce<{ end: number; stops: string[] }>(
      (state, segment, index) => {
        const nextEnd = state.end + segment.percent;
        const color = [
          "var(--brand-red)",
          "var(--brand-gray)",
          "#d14d72",
          "#64748b",
        ][index % 4];

        return {
          end: nextEnd,
          stops: [
            ...state.stops,
            `${color} ${state.end}% ${Math.min(nextEnd, 100)}%`,
          ],
        };
      },
      { end: 0, stops: [] },
    )
    .stops.join(", ");

  return (
    <div className="analytics-panel-stack">
      <section className="portal-panel analytics-results-hero">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">Visual Result</p>
            <h2 className="portal-section-title">What worked on {surfaceLabel}</h2>
            <p className="portal-insight-text">
              These results turn the active tab data into quick choices for the
              next post.
            </p>
          </div>
          <span className="portal-chip">{surfaceLabel}</span>
        </div>

        <div className="analytics-kpi-strip">
          <div className="portal-strip-card analytics-result-kpi">
            <StrategyLabel tone="descriptive">Descriptive Analytics</StrategyLabel>
            <span className="portal-strip-label">Posts reviewed</span>
            <strong className="portal-strip-value">{insights.totalPosts}</strong>
          </div>
          <div className="portal-strip-card analytics-result-kpi">
            <StrategyLabel tone="scoring">Engagement Scoring</StrategyLabel>
            <span className="portal-strip-label">Average score</span>
            <strong className="portal-strip-value">{insights.averageScore}</strong>
          </div>
          <div className="portal-strip-card analytics-result-kpi">
            <StrategyLabel tone="scoring">Engagement Scoring</StrategyLabel>
            <span className="portal-strip-label">Top score</span>
            <strong className="portal-strip-value">
              {insights.topPost?.ranking_score_public ?? 0}
            </strong>
          </div>
          <div className="portal-strip-card analytics-result-kpi">
            <StrategyLabel tone="classification">Classification</StrategyLabel>
            <span className="portal-strip-label">High performers</span>
            <strong className="portal-strip-value">
              {insights.classDistribution.High}
            </strong>
          </div>
        </div>
      </section>

      <section className="analytics-result-grid">
        <article className="portal-panel analytics-result-card analytics-result-card--recommendation">
          <StrategyLabel tone="recommendation">
            Engagement Scoring + Rule-based Recommendation
          </StrategyLabel>
          <p className="portal-eyebrow">Top Post</p>
          <h2 className="portal-section-title">
            {insights.topPost?.subject || insights.topPost?.post_id}
          </h2>
          <p className="portal-insight-text">
            This post created the strongest visible response. Reuse the topic,
            post style, and clear benefit when they fit the next message.
          </p>
          <div className="portal-list-items">
            <span className="portal-chip">
              {insights.topPost?.post_type || "Post type missing"}
            </span>
            <span className="portal-chip">
              {insights.topPost?.ranking_score_public ?? 0} score
            </span>
          </div>
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--monthly analytics-result-card--wide">
          <StrategyLabel tone="monthly">Monthly Trend Analysis</StrategyLabel>
          <p className="portal-eyebrow">Monthly Performance Trend</p>
          <h2 className="portal-section-title">Monthly performance trend</h2>
          <p className="portal-insight-text">
            This chart shows which months had stronger post performance.
          </p>
          {insights.monthlyTrend.length ? (
            <div className="analytics-month-chart">
              {insights.monthlyTrend.map((month) => (
                <div className="analytics-month-bar" key={month.monthKey}>
                  <span>{month.monthLabel}</span>
                  <i>
                    <b
                      style={{
                        height: `${Math.max(
                          (month.averageScore / monthlyMaxScore) * 100,
                          10,
                        )}%`,
                      }}
                    />
                  </i>
                  <strong>{month.averageScore}</strong>
                  <small>{month.posts} {month.posts === 1 ? "post" : "posts"}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="portal-insight-text">
              Add post dates to see monthly performance.
            </p>
          )}
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--monthly">
          <StrategyLabel tone="monthly">Monthly Trend Analysis</StrategyLabel>
          <p className="portal-eyebrow">Best Month</p>
          <h2 className="portal-section-title">
            {insights.bestMonth?.monthLabel || "No month yet"}
          </h2>
          <p className="portal-insight-text">
            The best month had the strongest average public score in this
            filtered result.
          </p>
          <div className="portal-list-items">
            <span className="portal-chip">
              {insights.bestMonth?.averageScore ?? 0} average score
            </span>
            <span className="portal-chip">
              {insights.bestMonth?.reactions ?? 0} reactions
            </span>
          </div>
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--monthly">
          <StrategyLabel tone="monthly">Monthly Trend Analysis</StrategyLabel>
          <p className="portal-eyebrow">Weakest Month</p>
          <h2 className="portal-section-title">
            {insights.weakestMonth?.monthLabel || "No month yet"}
          </h2>
          <p className="portal-insight-text">
            Review weaker months for topic, timing, and visual differences
            before planning the next month.
          </p>
          <div className="portal-list-items">
            <span className="portal-chip">
              {insights.weakestMonth?.averageScore ?? 0} average score
            </span>
            <span className="portal-chip">
              {insights.weakestMonth?.comments ?? 0} comments
            </span>
          </div>
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--scoring">
          <StrategyLabel tone="scoring">
            Descriptive Analytics + Engagement Scoring
          </StrategyLabel>
          <p className="portal-eyebrow">Best Hashtags</p>
          <h2 className="portal-section-title">Hashtags in stronger posts</h2>
          <p className="portal-insight-text">
            Use these again when the post topic fits. Keep the hashtag group
            relevant instead of making it longer.
          </p>
          <BarDiagram
            bars={hashtagBars}
            emptyText="Add hashtag values to see the strongest hashtag groups."
          />
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--descriptive">
          <StrategyLabel tone="descriptive">
            Descriptive Analytics + Engagement Scoring
          </StrategyLabel>
          <p className="portal-eyebrow">Best Subjects</p>
          <h2 className="portal-section-title">Topics to focus on</h2>
          <p className="portal-insight-text">
            These topics earned stronger scores. They are good starting points
            for the next idea.
          </p>
          <BarDiagram
            bars={subjectBars}
            emptyText="Add subjects to compare which topics work best."
          />
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--relationship">
          <StrategyLabel tone="relationship">
            Feature Engineering + Relationship Analysis
          </StrategyLabel>
          <p className="portal-eyebrow">Best Posting Time</p>
          <h2 className="portal-section-title">Hours with stronger posts</h2>
          <p className="portal-insight-text">
            Start with the stronger hour window, then compare the next upload to
            confirm it.
          </p>
          <BarDiagram
            bars={hourBars}
            emptyText="Add posting times to compare stronger hours."
          />
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--descriptive">
          <StrategyLabel tone="descriptive">Descriptive Analytics</StrategyLabel>
          <p className="portal-eyebrow">Content Mix</p>
          <h2 className="portal-section-title">Content type to reuse</h2>
          <p className="portal-insight-text">
            This shows which post formats fill the active result set.
          </p>
          <div className="analytics-mix-view">
            <div
              aria-label="Content type mix"
              className="analytics-mix-donut"
              style={{ background: `conic-gradient(${donutStops})` }}
            >
              <strong>{leadingPostType?.percent ?? 0}%</strong>
              <span>{leadingPostType?.label || "No type"}</span>
            </div>
            <div className="analytics-mix-legend">
              {postTypeMix.map((segment) => (
                <div key={segment.label}>
                  <span>{segment.label}</span>
                  <strong>{segment.percent}%</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="portal-panel analytics-result-card analytics-result-card--classification">
          <StrategyLabel tone="classification">Classification</StrategyLabel>
          <p className="portal-eyebrow">Performance Groups</p>
          <h2 className="portal-section-title">Low, Medium, High posts</h2>
          <p className="portal-insight-text">
            We group posts by public score so you can see how many posts stand
            out.
          </p>
          <div className="analytics-class-bars">
            {classLabels.map((label) => {
              const count = insights.classDistribution[label];
              const width = `${Math.max((count / insights.totalPosts) * 100, count ? 12 : 0)}%`;

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
        </article>
      </section>

      <section className="portal-panel analytics-recommendation analytics-result-card analytics-result-card--recommendation">
        <StrategyLabel tone="recommendation">
          Rule-based Recommendation
        </StrategyLabel>
        <p className="portal-eyebrow">Future Recommendation</p>
        <h2 className="portal-section-title">What to post next</h2>
        <p>{insights.recommendation}</p>
        <div className="portal-list-items">
          <span className="portal-chip">{insights.ruleInsights.bestTimeWindow}</span>
          <span className="portal-chip">{insights.ruleInsights.bestPostType}</span>
          <span className="portal-chip">{insights.ruleInsights.bestVisualStyle}</span>
        </div>
      </section>
    </div>
  );
}
