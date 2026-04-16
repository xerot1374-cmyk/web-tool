import Link from "next/link";
import PortalNav from "../PortalNav";

const activityGroups = [
  {
    title: "LinkedIn",
    items: ["Posts"],
  },
  {
    title: "Instagram",
    items: ["Posts", "Stories"],
  },
];

const insightCards = [
  {
    title: "Content mix",
    text: "Compare how much content is being created across LinkedIn posts, Instagram posts, and stories.",
  },
  {
    title: "Insight panels",
    text: "Use this area to surface performance trends, posting frequency, and template usage over time.",
  },
  {
    title: "Next step",
    text: "Connect real metrics later when your posting and tracking data source is ready.",
  },
];

export default function AnalyticsPage() {
  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <PortalNav isAuthenticated />
        <div className="portal-header-row">
          <div>
            <p className="portal-eyebrow">Data Analysis</p>
            <h1 className="main-heading portal-heading">Activities and insights</h1>
            <p className="description portal-description">
              Review all activity types in one place and open the insight area for your
              reporting workflow.
            </p>
          </div>

          <Link href="/account" className="portal-back-link">
            Back to portal
          </Link>
        </div>

        <section className="portal-two-col">
          <div className="portal-panel">
            <h2 className="portal-section-title">All Activities</h2>
            <div className="portal-list">
              {activityGroups.map((group) => (
                <div key={group.title} className="portal-list-card">
                  <div className="portal-list-title">{group.title}</div>
                  <div className="portal-list-items">
                    {group.items.map((item) => (
                      <span key={item} className="portal-chip">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="portal-panel">
            <h2 className="portal-section-title">See The Insights</h2>
            <div className="portal-insight-grid">
              {insightCards.map((card) => (
                <div key={card.title} className="portal-insight-card">
                  <div className="portal-insight-title">{card.title}</div>
                  <p className="portal-insight-text">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
