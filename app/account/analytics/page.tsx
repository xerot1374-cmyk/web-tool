"use client";

import Link from "next/link";
import { ChangeEvent, useMemo, useState } from "react";
import PortalNav from "../PortalNav";
import AnalyticsDataTable from "./AnalyticsDataTable";
import AnalyticsPlatformTabs from "./AnalyticsPlatformTabs";
import AnalyticsSectionTabs, { AnalyticsSection } from "./AnalyticsSectionTabs";
import AnalyticsStrategies from "./AnalyticsStrategies";
import AnalyticsVisualResult from "./AnalyticsVisualResult";
import AnalyticsAssistant from "./AnalyticsAssistant";
import {
  AnalyticsContentType,
  emptySectionMessage,
  emptyTimePeriodMessage,
  getStrategyInsights,
  mockPublicDataRows,
  parseUploadedFile,
  PublicDataRow,
} from "./analyticsUtils";

type InstagramSurface = "feed" | "story";
type TimeFilterMode = "all" | "last3" | "year" | "month" | "since";

function getRowDate(row: PublicDataRow) {
  const date = new Date(row.post_date);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getYearOptions(rows: PublicDataRow[]) {
  return [...new Set(
    rows.flatMap((row) => {
      const date = getRowDate(row);
      return date ? [date.getFullYear()] : [];
    }),
  )].sort((first, second) => second - first);
}

function getFilteredRows(
  rows: PublicDataRow[],
  mode: TimeFilterMode,
  selectedYear: string,
  selectedMonth: string,
  sinceDate: string,
) {
  if (mode === "all") {
    return rows;
  }

  const now = new Date();
  const threeYearsAgo = new Date(now);
  threeYearsAgo.setFullYear(now.getFullYear() - 3);
  const since = sinceDate ? new Date(`${sinceDate}T00:00:00`) : null;

  return rows.filter((row) => {
    const date = getRowDate(row);

    if (!date) {
      return false;
    }

    if (mode === "last3") {
      return date >= threeYearsAgo && date <= now;
    }

    if (mode === "year") {
      return selectedYear ? date.getFullYear() === Number(selectedYear) : true;
    }

    if (mode === "month") {
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return selectedMonth ? monthKey === selectedMonth : true;
    }

    return since ? date >= since : true;
  });
}

function getTimeFilterLabel(
  mode: TimeFilterMode,
  selectedYear: string,
  selectedMonth: string,
  sinceDate: string,
) {
  if (mode === "last3") {
    return "Last 3 years";
  }

  if (mode === "year") {
    return selectedYear ? `Year ${selectedYear}` : "Selected year";
  }

  if (mode === "month") {
    return selectedMonth || "Selected month";
  }

  if (mode === "since") {
    return sinceDate ? `Since ${sinceDate}` : "Since selected date";
  }

  return "All time";
}

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
  const [timeFilter, setTimeFilter] = useState<TimeFilterMode>("all");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const allRows = uploadedRows ?? mockPublicDataRows;
  const activeContentType = getActiveContentType(
    activePlatform,
    instagramSurface,
  );
  const surfaceRows = useMemo(
    () =>
      allRows.filter(
        (row) =>
          row.platform === activePlatform &&
          row.content_type === activeContentType,
      ),
    [activeContentType, activePlatform, allRows],
  );
  const yearOptions = useMemo(() => getYearOptions(surfaceRows), [surfaceRows]);
  const sectionRows = useMemo(
    () =>
      getFilteredRows(
        surfaceRows,
        timeFilter,
        selectedYear,
        selectedMonth,
        sinceDate,
      ),
    [selectedMonth, selectedYear, sinceDate, surfaceRows, timeFilter],
  );
  const insights = useMemo(() => getStrategyInsights(sectionRows), [sectionRows]);
  const surfaceLabel = getSurfaceLabel(activeContentType);
  const timeFilterLabel = getTimeFilterLabel(
    timeFilter,
    selectedYear,
    selectedMonth,
    sinceDate,
  );
  const emptyMessage =
    surfaceRows.length && !sectionRows.length
      ? emptyTimePeriodMessage
      : emptySectionMessage;
  const rowCountLabel = uploadedRows
    ? `${sectionRows.length} of ${surfaceRows.length} ${surfaceLabel} rows`
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

        <section className="portal-panel analytics-source-panel">
          <div className="analytics-section-heading">
            <div>
              <p className="portal-eyebrow">Data sources</p>
              <h2 className="portal-section-title">Bring data into the dashboard</h2>
            </div>
            <span className="portal-chip">
              {uploadedRows ? "Uploaded data active" : "Sample data active"}
            </span>
          </div>
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

          <div className="analytics-time-filter">
            <div>
              <p className="analytics-source-label">Time filter</p>
              <p className="portal-insight-text">
                Filter the active platform before the table, strategies,
                diagrams, and assistant update.
              </p>
            </div>
            <div className="analytics-time-filter__controls">
              <label className="analytics-source-field">
                <span className="analytics-source-label">Period</span>
                <select
                  className="portal-form__input analytics-filter-select"
                  onChange={(event) =>
                    setTimeFilter(event.target.value as TimeFilterMode)
                  }
                  value={timeFilter}
                >
                  <option value="all">All time</option>
                  <option value="last3">Last 3 years</option>
                  <option value="year">Selected year</option>
                  <option value="month">Selected month</option>
                  <option value="since">Since date</option>
                </select>
              </label>

              {timeFilter === "year" ? (
                <label className="analytics-source-field">
                  <span className="analytics-source-label">Year</span>
                  <select
                    className="portal-form__input analytics-filter-select"
                    onChange={(event) => setSelectedYear(event.target.value)}
                    value={selectedYear}
                  >
                    <option value="">All available years</option>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {timeFilter === "month" ? (
                <label className="analytics-source-field">
                  <span className="analytics-source-label">Month</span>
                  <input
                    className="portal-form__input"
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    type="month"
                    value={selectedMonth}
                  />
                </label>
              ) : null}

              {timeFilter === "since" ? (
                <label className="analytics-source-field">
                  <span className="analytics-source-label">Since</span>
                  <input
                    className="portal-form__input"
                    onChange={(event) => setSinceDate(event.target.value)}
                    type="date"
                    value={sinceDate}
                  />
                </label>
              ) : null}
            </div>
            <span className="portal-chip">{timeFilterLabel}</span>
          </div>

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
            emptyMessage={emptyMessage}
          />
        ) : null}

        {activeSection === "strategies" ? (
          <AnalyticsStrategies
            emptyMessage={emptyMessage}
            insights={insights}
            timeFilterLabel={timeFilterLabel}
          />
        ) : null}

        {activeSection === "visual" ? (
          <AnalyticsVisualResult
            emptyMessage={emptyMessage}
            insights={insights}
            surfaceLabel={surfaceLabel}
          />
        ) : null}

        {activeSection === "assistant" ? (
          <AnalyticsAssistant
            activeContentType={activeContentType}
            activePlatform={activePlatform}
            activeTimeFilter={{
              mode: timeFilter,
              label: timeFilterLabel,
              selectedYear,
              selectedMonth,
              sinceDate,
            }}
            emptyMessage={emptyMessage}
            insights={insights}
            surfaceLabel={surfaceLabel}
            timeFilterLabel={timeFilterLabel}
          />
        ) : null}
      </div>
    </main>
  );
}
