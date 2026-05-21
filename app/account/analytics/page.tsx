"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
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

type UploadedRow = Record<string, unknown>;

type DashboardCard = {
  title: string;
  value: string;
  text: string;
  items: string[];
};

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
    ranking_score_public: 253,
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
    ranking_score_public: 172,
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
    ranking_score_public: 331,
  },
];

const columnAliases: Record<
  Exclude<PublicDataColumn, "ranking_score_public">,
  string[]
> = {
  post_id: ["post_id", "post id", "id", "beitrag id"],
  post_url: ["post_url", "post url", "permalink", "post link", "beitrag url"],
  platform: ["platform", "plattform", "channel", "kanal"],
  post_date: ["post_date", "post date", "date", "datum"],
  post_time: ["post_time", "post time", "time", "uhrzeit"],
  posted_by: ["posted_by", "posted by", "author", "user", "nutzer"],
  post_text: ["post_text", "post text", "text", "caption", "copy"],
  subject: ["subject", "topic", "thema"],
  badge_text: ["badge_text", "badge text", "badge", "label"],
  hashtags: ["hashtags", "tags", "hashtag"],
  links: ["links", "url", "link", "urls"],
  post_image_url: [
    "post_image_url",
    "post image url",
    "image",
    "image_url",
    "image url",
  ],
  post_type: ["post_type", "post type", "type", "format"],
  visible_reactions: ["visible_reactions", "visible reactions", "reactions", "likes"],
  visible_comments: ["visible_comments", "visible comments", "comments"],
  visible_reposts: ["visible_reposts", "visible reposts", "reposts", "shares"],
};

function normalizeHeader(header: string) {
  return header
    .trim()
    .toLocaleLowerCase()
    .replaceAll("ä", "a")
    .replaceAll("ö", "o")
    .replaceAll("ü", "u")
    .replaceAll("ß", "ss")
    .replace(/[^a-z0-9]/g, "");
}

function toText(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function toCount(value: unknown) {
  const parsed = Number(
    toText(value)
      .replace(/[^\d,.-]/g, "")
      .replace(",", "."),
  );

  return Number.isFinite(parsed) ? parsed : 0;
}

function calculatePublicScore(row: Pick<
  PublicDataRow,
  "visible_reactions" | "visible_comments" | "visible_reposts"
>) {
  return (
    Number(row.visible_reactions) +
    Number(row.visible_comments) * 2 +
    Number(row.visible_reposts) * 3
  );
}

function normalizeUploadedRow(uploadedRow: UploadedRow): PublicDataRow {
  const uploadedValues = new Map(
    Object.entries(uploadedRow).map(([header, value]) => [
      normalizeHeader(header),
      value,
    ]),
  );

  const getColumnValue = (
    column: Exclude<PublicDataColumn, "ranking_score_public">,
  ) => {
    const alias = columnAliases[column].find((candidate) =>
      uploadedValues.has(normalizeHeader(candidate)),
    );

    return alias ? uploadedValues.get(normalizeHeader(alias)) : "";
  };

  const normalizedRow: PublicDataRow = {
    post_id: toText(getColumnValue("post_id")),
    post_url: toText(getColumnValue("post_url")),
    platform: toText(getColumnValue("platform")),
    post_date: toText(getColumnValue("post_date")),
    post_time: toText(getColumnValue("post_time")),
    posted_by: toText(getColumnValue("posted_by")),
    post_text: toText(getColumnValue("post_text")),
    subject: toText(getColumnValue("subject")),
    badge_text: toText(getColumnValue("badge_text")),
    hashtags: toText(getColumnValue("hashtags")),
    links: toText(getColumnValue("links")),
    post_image_url: toText(getColumnValue("post_image_url")),
    post_type: toText(getColumnValue("post_type")),
    visible_reactions: toCount(getColumnValue("visible_reactions")),
    visible_comments: toCount(getColumnValue("visible_comments")),
    visible_reposts: toCount(getColumnValue("visible_reposts")),
    ranking_score_public: 0,
  };

  normalizedRow.ranking_score_public = calculatePublicScore(normalizedRow);

  return normalizedRow;
}

function getSheetRows(workbook: XLSX.WorkBook) {
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  return XLSX.utils.sheet_to_json<UploadedRow>(workbook.Sheets[firstSheetName], {
    defval: "",
    raw: false,
  });
}

async function parseUploadedFile(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    cellDates: true,
  });

  return getSheetRows(workbook).map(normalizeUploadedRow);
}

function findMostCommon(values: string[]) {
  const counts = new Map<string, number>();

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0];
}

function getHashtags(rows: PublicDataRow[]) {
  return rows.flatMap((row) =>
    toText(row.hashtags)
      .split(/[\s,;]+/)
      .map((hashtag) => hashtag.trim())
      .filter((hashtag) => hashtag.startsWith("#")),
  );
}

function getContentMix(rows: PublicDataRow[]) {
  const platformCounts = new Map<string, number>();

  rows.forEach((row) => {
    const platform = toText(row.platform) || "Unspecified";
    platformCounts.set(platform, (platformCounts.get(platform) ?? 0) + 1);
  });

  return [...platformCounts.entries()].sort(
    (first, second) => second[1] - first[1],
  );
}

function buildDashboardCards(
  rows: PublicDataRow[],
  usesUploadedRows: boolean,
): DashboardCard[] {
  const topPost = [...rows].sort(
    (first, second) =>
      Number(second.ranking_score_public) - Number(first.ranking_score_public),
  )[0];
  const bestHashtag = findMostCommon(getHashtags(rows));
  const bestPostingTime = findMostCommon(
    rows.map((row) => toText(row.post_time)),
  );
  const bestSubject = findMostCommon(rows.map((row) => toText(row.subject)));
  const contentMix = getContentMix(rows);
  const leadingPlatform = contentMix[0];
  const contentMixPercent = leadingPlatform
    ? Math.round((leadingPlatform[1] / rows.length) * 100)
    : 0;
  const sourceLabel = usesUploadedRows ? "Imported data" : "Mock sample";
  const topPostLabel =
    toText(topPost?.subject) ||
    toText(topPost?.post_id) ||
    toText(topPost?.post_text).slice(0, 36) ||
    "No post yet";
  const bestSubjectLabel = bestSubject?.[0] || "Add a subject column";
  const bestHashtagLabel = bestHashtag?.[0] || "Add hashtag values";
  const bestTimeLabel = bestPostingTime?.[0] || "Add posting times";

  return [
    {
      title: "Top posts",
      value: topPostLabel,
      text: topPost
        ? `Highest visible public score: ${topPost.ranking_score_public}.`
        : "Import rows to compare public score.",
      items: [
        toText(topPost?.post_id) || sourceLabel,
        `${toText(topPost?.visible_reactions) || "0"} reactions`,
      ],
    },
    {
      title: "Best hashtags",
      value: bestHashtagLabel,
      text: bestHashtag
        ? "Most frequent hashtag in the rows currently shown."
        : "No hashtag column values are available yet.",
      items: [bestHashtag ? `${bestHashtag[1]} rows` : sourceLabel],
    },
    {
      title: "Best posting times",
      value: bestTimeLabel,
      text: bestPostingTime
        ? "Most frequent posting time in the rows currently shown."
        : "No posting time values are available yet.",
      items: [bestPostingTime ? `${bestPostingTime[1]} rows` : sourceLabel],
    },
    {
      title: "Best subjects",
      value: bestSubjectLabel,
      text: bestSubject
        ? "Most frequent subject in the normalized rows."
        : "No subject values are available yet.",
      items: [bestSubject ? `${bestSubject[1]} rows` : sourceLabel],
    },
    {
      title: "Content mix",
      value: leadingPlatform
        ? `${contentMixPercent}% ${leadingPlatform[0]}`
        : "No platforms yet",
      text: "Platform split for the rows currently powering the table.",
      items: contentMix
        .slice(0, 2)
        .map(([platform, count]) => `${count} ${platform}`),
    },
    {
      title: "Recommendation for future posts",
      value: bestSubject?.[0] || bestHashtag?.[0] || "Import more context",
      text:
        bestSubject || bestHashtag || bestPostingTime
          ? `Use the strongest available pattern${bestPostingTime ? ` around ${bestTimeLabel}` : ""} and compare the next export.`
          : "Add subjects, hashtags, and posting times before drawing a content recommendation.",
      items: [bestHashtagLabel, sourceLabel],
    },
  ];
}

export default function AnalyticsPage() {
  const [uploadedRows, setUploadedRows] = useState<PublicDataRow[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [importError, setImportError] = useState("");
  const tableRows = uploadedRows ?? publicDataRows;
  const dashboardCards = useMemo(
    () => buildDashboardCards(tableRows, uploadedRows !== null),
    [tableRows, uploadedRows],
  );

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const rows = await parseUploadedFile(file);

      setUploadedRows(rows);
      setUploadedFileName(file.name);
      setImportError("");
    } catch {
      setUploadedRows(null);
      setUploadedFileName(file.name);
      setImportError("This file could not be parsed. Upload a CSV or XLSX file.");
    }
  }

  return (
    <main className="app-container portal-shell">
      <div className="portal-wrapper">
        <PortalNav isAuthenticated />
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
                  Import CSV or XLSX rows into the normalized public table.
                </p>
                <label className="analytics-source-field analytics-file-field">
                  <span className="analytics-source-label">Data file</span>
                  <input
                    accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="portal-form__input portal-form__input--file"
                    onChange={handleFileChange}
                    type="file"
                  />
                </label>
                <div className="analytics-import-meta">
                  <span className="portal-chip">
                    {uploadedFileName || "Mock rows active"}
                  </span>
                  <span className="portal-chip">
                    {uploadedRows
                      ? `${uploadedRows.length} imported rows`
                      : "CSV / XLSX"}
                  </span>
                </div>
                {importError ? (
                  <div className="portal-alert portal-alert--error">
                    {importError}
                  </div>
                ) : null}
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
              <p className="portal-eyebrow">
                {uploadedRows ? "Imported rows" : "Mock normalized rows"}
              </p>
              <h2 className="portal-section-title">
                Normalized public data table
              </h2>
            </div>
            <span className="portal-chip">
              {uploadedRows
                ? `${uploadedRows.length} imported rows`
                : "Example values"}
            </span>
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
                {tableRows.map((row, rowIndex) => (
                  <tr key={`${row.post_id || "row"}-${rowIndex}`}>
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
