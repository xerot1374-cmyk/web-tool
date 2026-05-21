"use client";

import { FormEvent, useState } from "react";
import { StrategyInsights } from "./analyticsUtils";

type AnalyticsAssistantProps = {
  insights: StrategyInsights;
  surfaceLabel: string;
};

const starterQuestions = [
  "What should we post next?",
  "Which hashtags work best?",
  "Which time is best?",
  "How should the future post look?",
];

function getAssistantAnswer(question: string, insights: StrategyInsights) {
  const prompt = question.toLocaleLowerCase();
  const hashtag = insights.bestHashtag?.[0] || "focused hashtags";
  const subject = insights.bestSubject?.[0] || "the strongest subject";
  const time = insights.ruleInsights.bestTimeWindow;

  if (prompt.includes("hashtag") || prompt.includes("tag")) {
    return `The best hashtag signal in this data slice is ${hashtag}. Use it with a small relevant hashtag group and compare the next import before expanding the pattern.`;
  }

  if (prompt.includes("time") || prompt.includes("when")) {
    return `The strongest rule-based time window is ${time}. Schedule the next comparable post there, then compare its visible score with the current top post.`;
  }

  if (prompt.includes("platform")) {
    return "This assistant compares the active platform tab. Switch between LinkedIn, Instagram Feed, and Instagram Story to compare each section with its own uploaded rows.";
  }

  if (
    prompt.includes("look") ||
    prompt.includes("visual") ||
    prompt.includes("future")
  ) {
    return `Use ${insights.ruleInsights.bestVisualStyle.toLocaleLowerCase()} with ${subject}, a clear benefit in the badge text, and a direct next step. Keep the visible engagement pattern tied to ${hashtag}.`;
  }

  return `Based on the current data, the strongest next step is ${insights.recommendation} Start from the top post pattern, keep the message readable for non-technical viewers, and re-import the next export to verify the result.`;
}

export default function AnalyticsAssistant({
  insights,
  surfaceLabel,
}: AnalyticsAssistantProps) {
  const [question, setQuestion] = useState(starterQuestions[0]);
  const [askedQuestion, setAskedQuestion] = useState(starterQuestions[0]);
  const answer = getAssistantAnswer(askedQuestion, insights);

  function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAskedQuestion(question);
  }

  function selectStarterQuestion(starterQuestion: string) {
    setQuestion(starterQuestion);
    setAskedQuestion(starterQuestion);
  }

  return (
    <section className="portal-panel analytics-assistant">
      <div className="analytics-section-heading">
        <div>
          <p className="portal-eyebrow">AI Assistant</p>
          <h2 className="portal-section-title">Ask about {surfaceLabel}</h2>
        </div>
        <span className="portal-chip">Local rule-based answer</span>
      </div>

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
        <button className="portal-form__submit" type="submit">
          Ask assistant
        </button>
      </form>

      <div className="analytics-answer" aria-live="polite">
        <span className="analytics-source-label">Assistant answer</span>
        <p>{answer}</p>
      </div>
    </section>
  );
}
