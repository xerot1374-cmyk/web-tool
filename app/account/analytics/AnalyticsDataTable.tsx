import {
  getContentTypeLabel,
  publicDataColumns,
  PublicDataRow,
} from "./analyticsUtils";

type AnalyticsDataTableProps = {
  rows: PublicDataRow[];
  rowCountLabel: string;
  surfaceLabel: string;
};

export default function AnalyticsDataTable({
  rows,
  rowCountLabel,
  surfaceLabel,
}: AnalyticsDataTableProps) {
  const activityCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const label = getContentTypeLabel(row.content_type);
    counts[label] = (counts[label] ?? 0) + 1;
    return counts;
  }, {});

  return (
    <div className="analytics-panel-stack">
      <section className="portal-panel">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">All Activities</p>
            <h2 className="portal-section-title">{surfaceLabel}</h2>
          </div>
          <span className="portal-chip">{rowCountLabel}</span>
        </div>

        <div className="analytics-activity-grid">
          {Object.entries(activityCounts).map(([label, count]) => (
            <div className="portal-list-card" key={label}>
              <div className="portal-list-title">{label}</div>
              <div className="analytics-card-value">{count}</div>
              <p className="portal-insight-text">Rows in the active section.</p>
            </div>
          ))}
          {!rows.length ? (
            <div className="portal-list-card">
              <div className="portal-list-title">No rows in this section</div>
              <p className="portal-insight-text">
                Import rows with a matching platform and content type.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="portal-panel analytics-table-panel">
        <div className="analytics-section-heading">
          <div>
            <p className="portal-eyebrow">Normalized rows</p>
            <h2 className="portal-section-title">Uploaded data table</h2>
          </div>
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
              {rows.map((row, rowIndex) => (
                <tr key={`${row.post_id || "row"}-${rowIndex}`}>
                  {publicDataColumns.map((column) => (
                    <td key={`${row.post_id || rowIndex}-${column}`}>
                      {row[column]}
                    </td>
                  ))}
                </tr>
              ))}
              {!rows.length ? (
                <tr>
                  <td colSpan={publicDataColumns.length}>
                    No normalized rows match this tab yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
