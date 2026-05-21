"use client";

import { FormEvent, useState } from "react";
import {
  AnalyticsContentType,
  AnalyticsPlatform,
  emptySectionMessage,
  PublicDataRow,
  StrategyInsights,
} from "./analyticsUtils";

type AssistantTimeFilter = {
  mode: string;
  label: string;
  selectedYear?: string;
  selectedMonth?: string;
  sinceDate?: string;
};

type AnalyticsAssistantProps = {
  activeContentType: AnalyticsContentType;
  activePlatform: AnalyticsPlatform;
  activeTimeFilter: AssistantTimeFilter;
  emptyMessage?: string;
  insights: StrategyInsights;
  surfaceLabel: string;
  timeFilterLabel?: string;
};

const starterQuestions = [
  "What should we post next?",
  "Which hashtags work best?",
  "Which time is best?",
  "Which month is best?",
  "How should the future post look?",
];

const disconnectedMessage =
  "AI Assistant is not connected yet. Please add OPENAI_API_KEY to .env.local.";

function excerpt(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
}

function summarizeRow(row: PublicDataRow) {
  return {
    post_id: row.post_id,
    platform: row.platform,
    content_type: row.content_type,
    post_date: row.post_date,
    post_time: row.post_time,
    post_text_excerpt: excerpt(row.post_text, 180),
    subject: row.subject,
    badge_text: row.badge_text,
    hashtags: row.hashtags,
    post_type: row.post_type,
    visible_reactions: row.visible_reactions,
    visible_comments: row.visible_comments,
    visible_reposts: row.visible_reposts,
    ranking_score_public: row.ranking_score_public,
    has_link: Boolean(row.links),
    has_image: Boolean(row.post_image_url),
  };
}

function getTopRows(rows: PublicDataRow[]) {
  return [...rows]
    .sort(
      (first, second) =>
        second.ranking_score_public - first.ranking_score_public,
    )
    .slice(0, 5)
    .map(summarizeRow);
}

function getAssistantPayload(
  question: string,
  activePlatform: AnalyticsPlatform,
  activeContentType: AnalyticsContentType,
  activeTimeFilter: AssistantTimeFilter,
  insights: StrategyInsights,
) {
  return {
    question,
    activePlatform,
    activeContentType,
    activeTimeFilter,
    insights: {
      totalPosts: insights.totalPosts,
      averageScore: insights.averageScore,
      topPost: insights.topPost ? summarizeRow(insights.topPost) : null,
      bestHashtag: insights.bestHashtag
        ? {
            hashtag: insights.bestHashtag[0],
            occurrences: insights.bestHashtag[1],
          }
        : null,
      bestSubject: insights.bestSubject
        ? {
            subject: insights.bestSubject[0],
            rows: insights.bestSubject[1],
          }
        : null,
      bestPostingTime: insights.bestPostingTime
        ? {
            time: insights.bestPostingTime[0],
            rows: insights.bestPostingTime[1],
          }
        : null,
      monthlyTrendSummary: {
        bestMonth: insights.bestMonth ?? null,
        weakestMonth: insights.weakestMonth ?? null,
        months: insights.monthlyTrend.slice(-12),
      },
      engagementClassDistribution: insights.classDistribution,
      futureRecommendation: insights.recommendation,
      contentMix: insights.contentMix.slice(0, 5),
      strategyRules: insights.ruleInsights,
    },
    rowsSummary: {
      totalRows: insights.rows.length,
      representativeRows: getTopRows(insights.rows),
    },
  };
}

function getAssistantAnswer(
  question: string,
  insights: StrategyInsights,
  surfaceLabel: string,
  timeFilterLabel: string,
  emptyMessage: string,
) {
  if (!insights.totalPosts) {
    return emptyMessage;
  }

  const prompt = question.toLocaleLowerCase();
  const hashtag = insights.bestHashtag?.[0] || "focused hashtags";
  const subject = insights.bestSubject?.[0] || "the strongest subject";
  const time = insights.ruleInsights.bestTimeWindow;

  if (prompt.includes("hashtag") || prompt.includes("tag")) {
    return `The strongest hashtag in the current results is ${hashtag}. Use it again when the topic fits, keep the hashtag group focused, and compare the next upload.`;
  }

  if (prompt.includes("time") || prompt.includes("when")) {
    return `For ${surfaceLabel} in ${timeFilterLabel}, the stronger time window is ${time}. Try the next similar post in that window and compare it with the current best post.`;
  }

  if (prompt.includes("month")) {
    return `The strongest month in ${timeFilterLabel} is ${insights.bestMonth?.monthLabel || "not clear yet"}. Use month-by-month results to decide where to repeat the best topic and visual style.`;
  }

  if (prompt.includes("subject") || prompt.includes("topic")) {
    return `The strongest topic in the selected ${surfaceLabel} data is ${subject}. Build the next post around that topic when it fits the audience.`;
  }

  if (prompt.includes("platform")) {
    return "This answer uses the active platform tab. Switch between LinkedIn, Instagram Feed, and Instagram Story to compare each section and its selected time period.";
  }

  if (prompt.includes("story") || prompt.includes("feed")) {
    return `You are asking from the ${surfaceLabel} result for ${timeFilterLabel}. Compare Feed and Story tabs to see which one has stronger topics, post styles, and months.`;
  }

  if (prompt.includes("why") || prompt.includes("worked")) {
    return `The best ${surfaceLabel} post worked because its topic, format, and timing created the strongest visible response in ${timeFilterLabel}. Reuse the useful parts instead of copying it exactly.`;
  }

  if (prompt.includes("improve")) {
    return `Improve the next ${surfaceLabel} post by keeping one clear benefit, using the strongest fitting hashtags, and testing the stronger time or month from ${timeFilterLabel}.`;
  }

  if (prompt.includes("strategy") || prompt.includes("science")) {
    return "The strategy tabs turn post fields into practical checks: what worked, when it worked, which topic worked, and what to try again next.";
  }

  if (
    prompt.includes("look") ||
    prompt.includes("visual") ||
    prompt.includes("future")
  ) {
    return `Use ${insights.ruleInsights.bestVisualStyle.toLocaleLowerCase()} with ${subject}, a clear benefit in the badge text, and a simple next step. Keep hashtags close to the topic, starting with ${hashtag}.`;
  }

  return `Based on the selected ${surfaceLabel} data for ${timeFilterLabel}, ${insights.recommendation} Start from the best post idea, keep the message easy to read, and upload the next export to see whether it worked.`;
}

export default function AnalyticsAssistant({
  activeContentType,
  activePlatform,
  activeTimeFilter,
  emptyMessage = emptySectionMessage,
  insights,
  surfaceLabel,
  timeFilterLabel = "All time",
}: AnalyticsAssistantProps) {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [askedQuestion, setAskedQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [fallbackAnswer, setFallbackAnswer] = useState("");
  const [assistantError, setAssistantError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setAskedQuestion(trimmedQuestion);
    setAnswer("");
    setFallbackAnswer("");
    setAssistantError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          getAssistantPayload(
            trimmedQuestion,
            activePlatform,
            activeContentType,
            activeTimeFilter,
            insights,
          ),
        ),
      });
      const body = (await response.json().catch(() => null)) as
        | { answer?: string }
        | null;

      if (!response.ok || !body?.answer) {
        throw new Error("Analytics assistant request failed.");
      }

      setAnswer(body.answer);
    } catch {
      setAssistantError(disconnectedMessage);
      setFallbackAnswer(
        getAssistantAnswer(
          trimmedQuestion,
          insights,
          surfaceLabel,
          timeFilterLabel,
          emptyMessage,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  function selectStarterQuestion(starterQuestion: string) {
    setQuestion(starterQuestion);
  }

  return (
    <section className="portal-panel analytics-assistant">
      <div className="analytics-section-heading">
        <div>
          <span className="analytics-strategy-label">
            Social Media Data Science
          </span>
          <p className="portal-eyebrow">AI Data Science Assistant</p>
          <h2 className="portal-section-title">Ask about {surfaceLabel}</h2>
        </div>
        <span className="portal-chip">{timeFilterLabel}</span>
      </div>

      <p className="portal-insight-text">
        Ask questions about the uploaded social media data. The assistant
        explains the results in simple words and suggests future post ideas.
      </p>

      <div className="portal-list-items analytics-question-chips">
        {starterQuestions.map((starterQuestion) => (
          <button
            className="portal-chip analytics-question-chip"
            key={starterQuestion}
            onClick={() => selectStarterQuestion(starterQuestion)}
            type="button"
          >
            {starterQuestion}
          </button>
        ))}
      </div>

      <form className="analytics-assistant-form" onSubmit={askAssistant}>
        <label className="analytics-source-field">
          <span className="analytics-source-label">Question</span>
          <input
            className="portal-form__input"
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Which hashtags work best?"
            type="text"
            value={question}
          />
        </label>
        <button
          className="portal-form__submit"
          disabled={isLoading || !question.trim()}
          type="submit"
        >
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>

      {askedQuestion ? (
        <p className="analytics-assistant-question">
          <span className="analytics-source-label">Question sent</span>
          {askedQuestion}
        </p>
      ) : null}

      <div className="analytics-answer" aria-live="polite">
        <span className="analytics-source-label">Assistant answer</span>
        {isLoading ? <p>Reviewing the selected analytics results...</p> : null}
        {!isLoading && answer ? <p>{answer}</p> : null}
        {!isLoading && !answer && !assistantError ? (
          <p>Send a question to get an answer from the selected analytics data.</p>
        ) : null}
      </div>

      {assistantError ? (
        <div className="portal-alert portal-alert--error analytics-assistant-alert">
          {assistantError}
        </div>
      ) : null}

      {fallbackAnswer ? (
        <div className="analytics-answer analytics-answer--fallback">
          <span className="analytics-source-label">Local fallback answer</span>
          <p>{fallbackAnswer}</p>
        </div>
      ) : null}
    </section>
  );
}
