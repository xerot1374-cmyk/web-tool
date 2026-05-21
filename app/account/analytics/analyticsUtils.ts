import * as XLSX from "xlsx";

export type AnalyticsPlatform = "linkedin" | "instagram";
export type AnalyticsContentType =
  | "linkedin_post"
  | "instagram_feed"
  | "instagram_story";
export type EngagementClass = "Low" | "Medium" | "High";

export type PublicDataRow = {
  post_id: string;
  post_url: string;
  platform: AnalyticsPlatform;
  content_type: AnalyticsContentType;
  post_date: string;
  post_time: string;
  posted_by: string;
  post_text: string;
  subject: string;
  badge_text: string;
  hashtags: string;
  links: string;
  post_image_url: string;
  post_type: string;
  visible_reactions: number;
  visible_comments: number;
  visible_reposts: number;
  ranking_score_public: number;
};

export type DashboardCard = {
  title: string;
  value: string;
  text: string;
  items: string[];
};

export type DerivedFeature = {
  row: PublicDataRow;
  weekday: string;
  hour: number | null;
  hashtag_count: number;
  link_count: number;
  text_length: number;
  has_link: boolean;
  has_image: boolean;
  engagement_class: EngagementClass;
};

export type Relationship = {
  label: string;
  feature: string;
  value: number | null;
  note: string;
};

export type MonthlyTrend = {
  monthKey: string;
  monthLabel: string;
  posts: number;
  averageScore: number;
  reactions: number;
  comments: number;
  reposts: number;
};

export type StrategyInsights = {
  rows: PublicDataRow[];
  features: DerivedFeature[];
  totalPosts: number;
  averageScore: number;
  topPost?: PublicDataRow;
  bestSubject?: [string, number];
  bestHashtag?: [string, number];
  bestPostingTime?: [string, number];
  classDistribution: Record<EngagementClass, number>;
  relationships: Relationship[];
  monthlyTrend: MonthlyTrend[];
  bestMonth?: MonthlyTrend;
  weakestMonth?: MonthlyTrend;
  contentMix: [string, number][];
  ruleInsights: {
    bestTimeWindow: string;
    bestSubjectType: string;
    bestHashtagPattern: string;
    bestPostType: string;
    bestVisualStyle: string;
  };
  recommendation: string;
};

export const emptySectionMessage =
  "No data available yet. Upload CSV/Excel data or use sample data.";
export const emptyTimePeriodMessage =
  "No data available for this time period.";

export const publicDataColumns = [
  "post_id",
  "post_url",
  "platform",
  "content_type",
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

type UploadedRow = Record<string, unknown>;
type ImportColumn = Exclude<
  (typeof publicDataColumns)[number],
  "ranking_score_public"
>;

const columnAliases: Record<ImportColumn, string[]> = {
  post_id: ["post_id", "post id", "id", "beitrag id"],
  post_url: ["post_url", "post url", "permalink", "post link", "beitrag url"],
  platform: ["platform", "plattform", "channel", "kanal"],
  content_type: [
    "content_type",
    "content type",
    "contenttype",
    "placement",
    "surface",
  ],
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

export const mockPublicDataRows: PublicDataRow[] = [
  {
    post_id: "li-2401",
    post_url: "linkedin.com/company/protos-3d/posts/li-2401",
    platform: "linkedin",
    content_type: "linkedin_post",
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
    post_id: "li-2420",
    post_url: "linkedin.com/company/protos-3d/posts/li-2420",
    platform: "linkedin",
    content_type: "linkedin_post",
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
  {
    post_id: "li-2431",
    post_url: "linkedin.com/company/protos-3d/posts/li-2431",
    platform: "linkedin",
    content_type: "linkedin_post",
    post_date: "2026-05-19",
    post_time: "10:35",
    posted_by: "Protos 3D",
    post_text: "Tolerance tip: where a small material choice prevents rework.",
    subject: "Production readiness",
    badge_text: "Engineering tip",
    hashtags: "#Manufacturing #Engineering",
    links: "protos3d.example/tolerance-guide",
    post_image_url: "cdn.example/tolerance-tip.jpg",
    post_type: "Image post",
    visible_reactions: 156,
    visible_comments: 18,
    visible_reposts: 7,
    ranking_score_public: 213,
  },
  {
    post_id: "ig-8112",
    post_url: "instagram.com/p/ig-8112",
    platform: "instagram",
    content_type: "instagram_feed",
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
    post_id: "ig-8125",
    post_url: "instagram.com/p/ig-8125",
    platform: "instagram",
    content_type: "instagram_feed",
    post_date: "2026-05-13",
    post_time: "16:20",
    posted_by: "@protos3d",
    post_text: "Three surface finishes, one part, and the tradeoffs in a carousel.",
    subject: "Surface finishes",
    badge_text: "Compare",
    hashtags: "#3DPrinting #DesignProcess",
    links: "profile link",
    post_image_url: "cdn.example/finish-carousel-02.jpg",
    post_type: "Feed carousel",
    visible_reactions: 148,
    visible_comments: 11,
    visible_reposts: 5,
    ranking_score_public: 185,
  },
  {
    post_id: "ig-8134",
    post_url: "instagram.com/p/ig-8134",
    platform: "instagram",
    content_type: "instagram_feed",
    post_date: "2026-05-17",
    post_time: "11:10",
    posted_by: "@protos3d",
    post_text: "Short reel showing the prototype from print bed to desk review.",
    subject: "Workflow reveal",
    badge_text: "Process",
    hashtags: "#Prototype #ProductDesign",
    links: "",
    post_image_url: "cdn.example/workflow-reel-cover.jpg",
    post_type: "Feed reel",
    visible_reactions: 202,
    visible_comments: 19,
    visible_reposts: 8,
    ranking_score_public: 264,
  },
  {
    post_id: "igs-183",
    post_url: "instagram.com/stories/protos3d/igs-183",
    platform: "instagram",
    content_type: "instagram_story",
    post_date: "2026-05-11",
    post_time: "18:10",
    posted_by: "@protos3d",
    post_text: "Story frame showing the finish reveal before shipment.",
    subject: "Visual reveal",
    badge_text: "Behind the scenes",
    hashtags: "#Prototype #ShopFloor",
    links: "",
    post_image_url: "cdn.example/story-finish-reveal.jpg",
    post_type: "Story image",
    visible_reactions: 68,
    visible_comments: 3,
    visible_reposts: 1,
    ranking_score_public: 77,
  },
  {
    post_id: "igs-191",
    post_url: "instagram.com/stories/protos3d/igs-191",
    platform: "instagram",
    content_type: "instagram_story",
    post_date: "2026-05-15",
    post_time: "19:05",
    posted_by: "@protos3d",
    post_text: "Question sticker asking which finish should ship next.",
    subject: "Audience poll",
    badge_text: "Vote",
    hashtags: "#ProductDesign",
    links: "profile link",
    post_image_url: "cdn.example/story-poll-finish.jpg",
    post_type: "Story poll",
    visible_reactions: 94,
    visible_comments: 9,
    visible_reposts: 2,
    ranking_score_public: 118,
  },
  {
    post_id: "igs-204",
    post_url: "instagram.com/stories/protos3d/igs-204",
    platform: "instagram",
    content_type: "instagram_story",
    post_date: "2026-05-20",
    post_time: "08:45",
    posted_by: "@protos3d",
    post_text: "Morning story with a close-up of a support removal step.",
    subject: "Shop floor step",
    badge_text: "Behind the build",
    hashtags: "#ShopFloor #Prototype",
    links: "",
    post_image_url: "cdn.example/story-support-removal.jpg",
    post_type: "Story image",
    visible_reactions: 71,
    visible_comments: 4,
    visible_reposts: 1,
    ranking_score_public: 82,
  },
];

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

export function toText(value: unknown) {
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

export function calculatePublicScore(
  row: Pick<
    PublicDataRow,
    "visible_reactions" | "visible_comments" | "visible_reposts"
  >,
) {
  return (
    row.visible_reactions +
    row.visible_comments * 2 +
    row.visible_reposts * 3
  );
}

function normalizePlatform(value: string, fallbackSource: string): AnalyticsPlatform {
  const source = `${value} ${fallbackSource}`.toLocaleLowerCase();

  return source.includes("insta") ? "instagram" : "linkedin";
}

function normalizeContentType(
  value: string,
  platform: AnalyticsPlatform,
  fallbackSource: string,
): AnalyticsContentType {
  const source = `${value} ${fallbackSource}`.toLocaleLowerCase();

  if (platform === "linkedin") {
    return "linkedin_post";
  }

  return source.includes("story") ? "instagram_story" : "instagram_feed";
}

function normalizeUploadedRow(uploadedRow: UploadedRow): PublicDataRow {
  const uploadedValues = new Map(
    Object.entries(uploadedRow).map(([header, value]) => [
      normalizeHeader(header),
      value,
    ]),
  );

  const getColumnValue = (column: ImportColumn) => {
    const alias = columnAliases[column].find((candidate) =>
      uploadedValues.has(normalizeHeader(candidate)),
    );

    return alias ? uploadedValues.get(normalizeHeader(alias)) : "";
  };

  const postUrl = toText(getColumnValue("post_url"));
  const postType = toText(getColumnValue("post_type"));
  const contentTypeValue = toText(getColumnValue("content_type"));
  const platform = normalizePlatform(
    toText(getColumnValue("platform")),
    `${contentTypeValue} ${postType} ${postUrl}`,
  );
  const normalizedRow: PublicDataRow = {
    post_id: toText(getColumnValue("post_id")),
    post_url: postUrl,
    platform,
    content_type: normalizeContentType(
      contentTypeValue,
      platform,
      `${postType} ${postUrl}`,
    ),
    post_date: toText(getColumnValue("post_date")),
    post_time: toText(getColumnValue("post_time")),
    posted_by: toText(getColumnValue("posted_by")),
    post_text: toText(getColumnValue("post_text")),
    subject: toText(getColumnValue("subject")),
    badge_text: toText(getColumnValue("badge_text")),
    hashtags: toText(getColumnValue("hashtags")),
    links: toText(getColumnValue("links")),
    post_image_url: toText(getColumnValue("post_image_url")),
    post_type: postType,
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

export async function parseUploadedFile(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), {
    cellDates: true,
  });

  return getSheetRows(workbook).map(normalizeUploadedRow);
}

export function findMostCommon(values: string[]) {
  const counts = new Map<string, number>();

  values
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));

  return [...counts.entries()].sort((first, second) => second[1] - first[1])[0];
}

export function getHashtags(rows: PublicDataRow[]) {
  return rows.flatMap((row) =>
    row.hashtags
      .split(/[\s,;]+/)
      .map((hashtag) => hashtag.trim())
      .filter((hashtag) => hashtag.startsWith("#")),
  );
}

function getLinks(value: string) {
  return value
    .split(/[\s,;]+/)
    .map((link) => link.trim())
    .filter(Boolean);
}

function getWeekday(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function getHour(timeValue: string) {
  const hour = Number(timeValue.match(/(\d{1,2})/)?.[1]);

  return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function getEngagementClass(score: number): EngagementClass {
  if (score >= 180) {
    return "High";
  }

  return score >= 70 ? "Medium" : "Low";
}

export function createDerivedFeatures(rows: PublicDataRow[]) {
  return rows.map((row) => ({
    row,
    weekday: getWeekday(row.post_date),
    hour: getHour(row.post_time),
    hashtag_count: getHashtags([row]).length,
    link_count: getLinks(row.links).length,
    text_length: row.post_text.length,
    has_link: getLinks(row.links).length > 0,
    has_image: Boolean(row.post_image_url),
    engagement_class: getEngagementClass(row.ranking_score_public),
  }));
}

function getPearsonCorrelation(points: [number, number][]) {
  if (points.length < 2) {
    return null;
  }

  const xAverage =
    points.reduce((sum, [feature]) => sum + feature, 0) / points.length;
  const yAverage =
    points.reduce((sum, [, score]) => sum + score, 0) / points.length;
  const totals = points.reduce(
    (value, [feature, score]) => {
      const xDelta = feature - xAverage;
      const yDelta = score - yAverage;

      return {
        numerator: value.numerator + xDelta * yDelta,
        xSquares: value.xSquares + xDelta * xDelta,
        ySquares: value.ySquares + yDelta * yDelta,
      };
    },
    { numerator: 0, xSquares: 0, ySquares: 0 },
  );
  const denominator = Math.sqrt(totals.xSquares * totals.ySquares);

  return denominator ? Number((totals.numerator / denominator).toFixed(2)) : null;
}

function getAverageScoreByValue(rows: PublicDataRow[], getValue: (row: PublicDataRow) => string) {
  const scores = new Map<string, { total: number; count: number }>();

  rows.forEach((row) => {
    const value = getValue(row).trim();

    if (!value) {
      return;
    }

    const score = scores.get(value) ?? { total: 0, count: 0 };
    scores.set(value, {
      total: score.total + row.ranking_score_public,
      count: score.count + 1,
    });
  });

  return [...scores.entries()].sort(
    (first, second) =>
      second[1].total / second[1].count - first[1].total / first[1].count,
  )[0];
}

function getTimeWindow(hour: number | null) {
  if (hour === null) {
    return "Add posting times";
  }

  if (hour < 12) {
    return "Morning";
  }

  return hour < 17 ? "Afternoon" : "Evening";
}

function getContentMix(rows: PublicDataRow[]) {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const label = row.content_type.replaceAll("_", " ");
    counts.set(label, (counts.get(label) ?? 0) + 1);
  });

  return [...counts.entries()].sort((first, second) => second[1] - first[1]);
}

function getMonthKey(dateValue: string) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthlyTrend(rows: PublicDataRow[]) {
  const months = new Map<
    string,
    {
      posts: number;
      scoreTotal: number;
      reactions: number;
      comments: number;
      reposts: number;
    }
  >();

  rows.forEach((row) => {
    const monthKey = getMonthKey(row.post_date);

    if (!monthKey) {
      return;
    }

    const month = months.get(monthKey) ?? {
      posts: 0,
      scoreTotal: 0,
      reactions: 0,
      comments: 0,
      reposts: 0,
    };
    months.set(monthKey, {
      posts: month.posts + 1,
      scoreTotal: month.scoreTotal + row.ranking_score_public,
      reactions: month.reactions + row.visible_reactions,
      comments: month.comments + row.visible_comments,
      reposts: month.reposts + row.visible_reposts,
    });
  });

  return [...months.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([monthKey, month]) => ({
      monthKey,
      monthLabel: new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(new Date(`${monthKey}-01T12:00:00`)),
      posts: month.posts,
      averageScore: Math.round(month.scoreTotal / month.posts),
      reactions: month.reactions,
      comments: month.comments,
      reposts: month.reposts,
    }));
}

export function getStrategyInsights(rows: PublicDataRow[]): StrategyInsights {
  const features = createDerivedFeatures(rows);
  const topPost = [...rows].sort(
    (first, second) => second.ranking_score_public - first.ranking_score_public,
  )[0];
  const bestSubjectAverage = getAverageScoreByValue(rows, (row) => row.subject);
  const bestPostTypeAverage = getAverageScoreByValue(rows, (row) => row.post_type);
  const bestHashtag = findMostCommon(getHashtags(rows));
  const bestPostingTime = findMostCommon(rows.map((row) => row.post_time));
  const scoreTotal = rows.reduce(
    (total, row) => total + row.ranking_score_public,
    0,
  );
  const classDistribution = features.reduce<Record<EngagementClass, number>>(
    (distribution, feature) => ({
      ...distribution,
      [feature.engagement_class]: distribution[feature.engagement_class] + 1,
    }),
    { Low: 0, Medium: 0, High: 0 },
  );
  const bestHourFeature = features
    .filter((feature) => feature.hour !== null)
    .sort((first, second) => second.row.ranking_score_public - first.row.ranking_score_public)[0];
  const imageAverage = getAverageScoreByValue(rows, (row) =>
    row.post_image_url ? "image" : "text",
  );
  const bestSubject = bestSubjectAverage
    ? [bestSubjectAverage[0], bestSubjectAverage[1].count] as [string, number]
    : undefined;
  const recommendationSubject = bestSubject?.[0] || "the strongest subject";
  const recommendationHashtag = bestHashtag?.[0] || "focused hashtags";
  const recommendationTime = getTimeWindow(bestHourFeature?.hour ?? null);
  const monthlyTrend = getMonthlyTrend(rows);
  const rankedMonths = [...monthlyTrend].sort(
    (first, second) => second.averageScore - first.averageScore,
  );

  return {
    rows,
    features,
    totalPosts: rows.length,
    averageScore: rows.length ? Math.round(scoreTotal / rows.length) : 0,
    topPost,
    bestSubject,
    bestHashtag,
    bestPostingTime,
    classDistribution,
    relationships: [
      {
        label: "Hour vs ranking score",
        feature: "hour",
        value: getPearsonCorrelation(
          features.flatMap((feature) =>
            feature.hour === null
              ? []
              : [[feature.hour, feature.row.ranking_score_public]],
          ),
        ),
        note: "Pearson correlation over rows with a parsed posting hour.",
      },
      {
        label: "Hashtag count vs ranking score",
        feature: "hashtag_count",
        value: getPearsonCorrelation(
          features.map((feature) => [
            feature.hashtag_count,
            feature.row.ranking_score_public,
          ]),
        ),
        note: "Compares hashtag volume with the public score.",
      },
      {
        label: "Text length vs ranking score",
        feature: "text_length",
        value: getPearsonCorrelation(
          features.map((feature) => [
            feature.text_length,
            feature.row.ranking_score_public,
          ]),
        ),
        note: "Compares caption length with the public score.",
      },
      {
        label: "Link count vs ranking score",
        feature: "link_count",
        value: getPearsonCorrelation(
          features.map((feature) => [
            feature.link_count,
            feature.row.ranking_score_public,
          ]),
        ),
        note: "Compares link count with the public score.",
      },
    ],
    monthlyTrend,
    bestMonth: rankedMonths[0],
    weakestMonth: rankedMonths.at(-1),
    contentMix: getContentMix(rows),
    ruleInsights: {
      bestTimeWindow: recommendationTime,
      bestSubjectType: recommendationSubject,
      bestHashtagPattern: bestHashtag
        ? `${bestHashtag[0]} appears most often`
        : "Add hashtags to detect a pattern",
      bestPostType: bestPostTypeAverage?.[0] || "Add post types",
      bestVisualStyle:
        imageAverage?.[0] === "image"
          ? "Rows with a visual asset"
          : "Text-led rows in this slice",
    },
    recommendation: rows.length
      ? `Use ${recommendationSubject} content in the ${recommendationTime.toLocaleLowerCase()} window, keep ${recommendationHashtag} focused, and reuse the strongest post type with a clear next step.`
      : "Upload rows for this surface to produce a recommendation.",
  };
}

export function buildDashboardCards(insights: StrategyInsights): DashboardCard[] {
  const topPostLabel =
    insights.topPost?.subject ||
    insights.topPost?.post_id ||
    insights.topPost?.post_text.slice(0, 36) ||
    "No post yet";
  const contentMix = insights.contentMix[0];
  const classItems = (Object.entries(insights.classDistribution) as [
    EngagementClass,
    number,
  ][]).map(([label, count]) => `${label}: ${count}`);

  return [
    {
      title: "Top post",
      value: topPostLabel,
      text: insights.topPost
        ? `Public score ${insights.topPost.ranking_score_public}.`
        : "No rows are available for this section.",
      items: [
        insights.topPost?.post_id || "No post ID",
        `${insights.topPost?.visible_reactions ?? 0} reactions`,
      ],
    },
    {
      title: "Best hashtags",
      value: insights.bestHashtag?.[0] || "Add hashtags",
      text: "Most frequent hashtag in the current section.",
      items: [insights.bestHashtag ? `${insights.bestHashtag[1]} uses` : "No data"],
    },
    {
      title: "Best posting time",
      value: insights.bestPostingTime?.[0] || "Add time values",
      text: "Most repeated posting time in the current section.",
      items: [insights.ruleInsights.bestTimeWindow],
    },
    {
      title: "Best subject",
      value: insights.bestSubject?.[0] || "Add subjects",
      text: "Subject with the strongest average public score.",
      items: [insights.bestSubject ? `${insights.bestSubject[1]} rows` : "No data"],
    },
    {
      title: "Content mix",
      value: contentMix?.[0] || "No mix yet",
      text: "Content-type split for the active platform section.",
      items: insights.contentMix.slice(0, 2).map(([label, count]) => `${count} ${label}`),
    },
    {
      title: "Engagement classes",
      value: `${insights.classDistribution.High} high`,
      text: "Rule-based Low, Medium, and High public score classes.",
      items: classItems,
    },
  ];
}

export function getPlatformLabel(platform: AnalyticsPlatform) {
  return platform === "linkedin" ? "LinkedIn" : "Instagram";
}

export function getContentTypeLabel(contentType: AnalyticsContentType) {
  if (contentType === "instagram_story") {
    return "Instagram Story";
  }

  return contentType === "instagram_feed" ? "Instagram Feed" : "LinkedIn Post";
}
