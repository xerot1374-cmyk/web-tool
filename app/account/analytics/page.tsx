import Link from "next/link";
import { requireCurrentUser } from "@/app/lib/currentUser";
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

const publicDataColumns = [
  "post_id",
  "post_url",
  "platform",
  "post_date",
  "post_time",
  "posted_by",
  "post_text",
  "subject",
  "badge_text",
  "hashtags",
  "links",
  "post_image_url",
  "post_type",
  "visible_reactions",
  "visible_comments",
  "visible_reposts",
  "ranking_score_public",
] as const;

type PublicDataColumn = (typeof publicDataColumns)[number];

type PublicDataRow = Record<PublicDataColumn, string | number>;

const publicDataRows: PublicDataRow[] = [
  {
    post_id: "li-2401",
    post_url: "linkedin.com/company/protos-3d/posts/li-2401",
    platform: "LinkedIn",
    post_date: "2026-05-06",
    post_time: "09:15",
    posted_by: "Protos 3D",
    post_text: "Prototype review: a faster path from CAD to testable part.",
    subject: "Rapid prototyping",
    badge_text: "Case study",
    hashtags: "#3DPrinting #ProductDesign",
    links: "protos3d.example/case-study",
    post_image_url: "cdn.example/protos-review-cover.jpg",
    post_type: "Image post",
    visible_reactions: 184,
    visible_comments: 21,
    visible_reposts: 9,
    ranking_score_public: 86,
  },
  {
    post_id: "ig-8112",
    post_url: "instagram.com/p/ig-8112",
    platform: "Instagram",
    post_date: "2026-05-09",
    post_time: "12:40",
    posted_by: "@protos3d",
    post_text: "Material comparison for three finish options on one part.",
    subject: "Materials",
    badge_text: "Carousel",
    hashtags: "#Manufacturing #MaterialScience",
    links: "profile link",
    post_image_url: "cdn.example/material-carousel-01.jpg",
    post_type: "Carousel",
    visible_reactions: 132,
    visible_comments: 14,
    visible_reposts: 4,
    ranking_score_public: 74,
  },
  {
    post_id: "li-2420",
    post_url: "linkedin.com/company/protos-3d/posts/li-2420",
    platform: "LinkedIn",
    post_date: "2026-05-14",
    post_time: "08:05",
    posted_by: "Mira Keller",
    post_text: "Five checks before a prototype becomes a production quote.",
    subject: "Design checks",
    badge_text: "Checklist",
    hashtags: "#Engineering #Prototyping",
    links: "protos3d.example/checklist",
    post_image_url: "cdn.example/design-checklist.png",
    post_type: "Document post",
    visible_reactions: 219,
    visible_comments: 32,
    visible_reposts: 16,
    ranking_score_public: 93,
  },
];

const dashboardCards = [
  {
    title: "Top posts",
    value: "Checklist post",
    text: "The design-check post leads the public ranking with 219 visible reactions.",
    items: ["li-2420", "93 public score"],
  },
  {
    title: "Best hashtags",
    value: "#Engineering",
    text: "Technical tags pair well with prototype and product design topics.",
    items: ["#Prototyping", "#3DPrinting"],
  },
  {
    title: "Best posting times",
    value: "08:00-10:00",
    text: "Morning LinkedIn examples currently show stronger public engagement.",
    items: ["Tue-Thu", "Mock sample only"],
  },
  {
    title: "Best subjects",
    value: "Design checks",
    text: "Practical education and material comparisons are the strongest examples.",
    items: ["Rapid prototyping", "Materials"],
  },
  {
    title: "Content mix",
    value: "67% LinkedIn",
    text: "The normalized example set includes LinkedIn image and document posts plus Instagram carousel content.",
    items: ["2 LinkedIn posts", "1 Instagram post"],
  },
  {
    title: "Recommendation for future posts",
    value: "Teach with proof",
    text: "Publish more checklist-led posts with concrete process visuals and a focused CTA link.",
    items: ["Test mornings", "Keep source exports"],
  },
];

export default async function AnalyticsPage() {
  const user = await requireCurrentUser();

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <PortalNav isAuthenticated isAdmin={user.isAdmin} />
        <div className="portal-header-row">
          <div>
            <p className="portal-eyebrow">Data Analysis</p>
            <h1 className="main-heading portal-heading">
              Activities and insights
            </h1>
            <p className="description portal-description">
              Review all activity types in one place and open the insight area
              for your reporting workflow.
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

          <div className="portal-panel analytics-source-panel">
            <h2 className="portal-section-title">Data sources</h2>
            <div className="analytics-source-grid">
              <label className="analytics-source-field">
                <span className="analytics-source-label">
                  LinkedIn company URL
                </span>
                <input
                  className="portal-form__input analytics-source-input"
                  type="url"
                  defaultValue="https://www.linkedin.com/company/protos-3d/posts/?feedView=all"
                />
              </label>

              <div className="analytics-upload-placeholder">
                <div className="portal-list-title">CSV / Excel upload</div>
                <p className="portal-insight-text">
                  Upload placeholder for normalized export rows.
                </p>
                <span className="portal-chip">No upload logic yet</span>
              </div>

              <div className="analytics-upload-placeholder">
                <div className="portal-list-title">Instagram data upload</div>
                <p className="portal-insight-text">
                  Upload placeholder for Instagram post and story data.
                </p>
                <span className="portal-chip">No API connected</span>
              </div>
            </div>
          </div>
        </section>

        <section className="portal-panel analytics-public-note">
          <div>
            <p className="portal-eyebrow">Public data scope</p>
            <h2 className="portal-section-title">Visible metrics first</h2>
          </div>
          <p className="portal-insight-text">
            Public LinkedIn data can show only visible data like post text,
            hashtags, links, images, reactions, comments, and reposts. Real
            insights like impressions, reach, clicks, website visits, saves,
            and leads need company analytics export later.
          </p>
        </section>

        <section className="portal-panel analytics-table-panel">
          <div className="analytics-section-heading">
            <div>
              <p className="portal-eyebrow">Mock normalized rows</p>
              <h2 className="portal-section-title">
                Normalized public data table
              </h2>
            </div>
            <span className="portal-chip">Example values</span>
          </div>

          <div className="analytics-table-wrap">
            <table className="analytics-table">
              <thead>
                <tr>
                  {publicDataColumns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {publicDataRows.map((row) => (
                  <tr key={row.post_id}>
                    {publicDataColumns.map((column) => (
                      <td key={`${row.post_id}-${column}`}>{row[column]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="analytics-section-heading">
            <div>
              <p className="portal-eyebrow">Dashboard</p>
              <h2 className="portal-section-title">See The Insights</h2>
            </div>
          </div>

          <div className="analytics-dashboard-grid">
            {dashboardCards.map((card) => (
              <div key={card.title} className="portal-insight-card analytics-card">
                <div className="analytics-card-title">{card.title}</div>
                <div className="analytics-card-value">{card.value}</div>
                <p className="portal-insight-text">{card.text}</p>
                <div className="portal-list-items">
                  {card.items.map((item) => (
                    <span key={item} className="portal-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
