"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import PortalNav from "../PortalNav";
import AnalyticsDataTable from "./AnalyticsDataTable";
import AnalyticsPlatformTabs from "./AnalyticsPlatformTabs";
import AnalyticsSectionTabs, { AnalyticsSection } from "./AnalyticsSectionTabs";
import AnalyticsStrategies from "./AnalyticsStrategies";
import AnalyticsVisualResult from "./AnalyticsVisualResult";
import {
  AnalyticsContentType,
  getStrategyInsights,
  mockPublicDataRows,
  parseUploadedFile,
  PublicDataRow,
} from "./analyticsUtils";

type InstagramSurface = "feed" | "story";

const activityGroups = [
  {
    title: "LinkedIn",
    items: ["Posts"],
  },
  {
    title: "Instagram",
    items: ["Feed", "Story"],
  },
];

function getActiveContentType(
  platform: "linkedin" | "instagram",
  instagramSurface: InstagramSurface,
): AnalyticsContentType {
  if (platform === "linkedin") {
    return "linkedin_post";
  }

  return instagramSurface === "story" ? "instagram_story" : "instagram_feed";
}

function getSurfaceLabel(contentType: AnalyticsContentType) {
  if (contentType === "instagram_story") {
    return "Instagram Story";
  }

  return contentType === "instagram_feed" ? "Instagram Feed" : "LinkedIn";
}

export default function AnalyticsPage() {
  const [uploadedRows, setUploadedRows] = useState<PublicDataRow[] | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [activePlatform, setActivePlatform] = useState<
    "linkedin" | "instagram"
  >("linkedin");
  const [instagramSurface, setInstagramSurface] =
    useState<InstagramSurface>("feed");
  const [activeSection, setActiveSection] =
    useState<AnalyticsSection>("data");
  const allRows = uploadedRows ?? mockPublicDataRows;
  const activeContentType = getActiveContentType(
    activePlatform,
    instagramSurface,
  );
  const sectionRows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          row.platform === activePlatform &&
          row.content_type === activeContentType,
      ),
    [activeContentType, activePlatform, allRows],
  );
  const insights = useMemo(() => getStrategyInsights(sectionRows), [sectionRows]);
  const surfaceLabel = getSurfaceLabel(activeContentType);
  const rowCountLabel = uploadedRows
    ? `${sectionRows.length} of ${uploadedRows.length} imported rows`
    : `${sectionRows.length} mock rows`;

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
              Upload normalized public rows, compare platform surfaces, and
              turn the visible engagement signals into future content direction.
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
                  Import CSV or XLSX rows into the platform tabs below.
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
                  Instagram feed and story rows can use the same local data
                  import with a matching content type.
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

        <section className="portal-panel analytics-workspace">
          <div className="analytics-section-heading">
            <div>
              <p className="portal-eyebrow">Platform workspace</p>
              <h2 className="portal-section-title">{surfaceLabel} analysis</h2>
            </div>
            <span className="portal-chip">{rowCountLabel}</span>
          </div>

          <AnalyticsPlatformTabs
            activePlatform={activePlatform}
            onChange={setActivePlatform}
          />

          {activePlatform === "instagram" ? (
            <div
              className="analytics-tabs analytics-tabs--subtabs"
              role="tablist"
              aria-label="Instagram content"
            >
              {(["feed", "story"] as const).map((surface) => (
                <button
                  aria-selected={instagramSurface === surface}
                  className={`analytics-tab analytics-tab--subtab${instagramSurface === surface ? " analytics-tab--active" : ""}`}
                  key={surface}
                  onClick={() => setInstagramSurface(surface)}
                  role="tab"
                  type="button"
                >
                  {surface === "feed" ? "Feed" : "Story"}
                </button>
              ))}
            </div>
          ) : null}

          <AnalyticsSectionTabs
            activeSection={activeSection}
            onChange={setActiveSection}
          />
        </section>

        {activeSection === "data" ? (
          <AnalyticsDataTable
            rowCountLabel={rowCountLabel}
            rows={sectionRows}
            surfaceLabel={surfaceLabel}
          />
        ) : null}

        {activeSection === "strategies" ? (
          <AnalyticsStrategies insights={insights} />
        ) : null}

        {activeSection === "visual" ? (
          <AnalyticsVisualResult insights={insights} surfaceLabel={surfaceLabel} />
        ) : null}
      </div>
    </main>
  );
}
