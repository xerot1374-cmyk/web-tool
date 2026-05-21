import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const missingKeyMessage =
  "AI Assistant is not connected yet. Please add OPENAI_API_KEY to .env.local.";

const assistantInstruction = `You are a Social Media Data Science Assistant for a company dashboard.
You analyze LinkedIn and Instagram post performance.
You understand descriptive analytics, feature engineering, engagement scoring, monthly trend analysis, relationship analysis, classification into Low/Medium/High, and rule-based future recommendation.
Answer in simple business language.
Avoid hard technical words unless the user asks.
Do not invent data.
Use only the provided analytics insights and row summaries.
If data is missing, explain what is missing and what the user should upload.
Always give practical recommendations for future posts.`;

type AssistantRequest = {
  question?: unknown;
  activePlatform?: unknown;
  activeContentType?: unknown;
  activeTimeFilter?: unknown;
  insights?: unknown;
  rowsSummary?: unknown;
};

function isAllowedPlatform(value: unknown) {
  return value === "linkedin" || value === "instagram";
}

function isAllowedContentType(value: unknown) {
  return (
    value === "linkedin_post" ||
    value === "instagram_feed" ||
    value === "instagram_story"
  );
}

function getQuestion(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 800) : "";
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AssistantRequest | null;
  const question = getQuestion(body?.question);

  if (
    !body ||
    !question ||
    !isAllowedPlatform(body.activePlatform) ||
    !isAllowedContentType(body.activeContentType)
  ) {
    return NextResponse.json(
      { message: "Invalid analytics assistant request." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ message: missingKeyMessage }, { status: 503 });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: assistantInstruction,
      input: [
        "Answer the user's dashboard question using only this analytics context.",
        `Question: ${question}`,
        `Analytics context: ${JSON.stringify({
          activePlatform: body.activePlatform,
          activeContentType: body.activeContentType,
          activeTimeFilter: body.activeTimeFilter ?? {},
          insights: body.insights ?? {},
          rowsSummary: body.rowsSummary ?? {},
        })}`,
      ].join("\n\n"),
    });
    const answer = response.output_text.trim();

    if (!answer) {
      throw new Error("OpenAI response did not include text.");
    }

    return NextResponse.json({ answer });
  } catch (error) {
    console.error("Analytics assistant response failed.", error);
    return NextResponse.json(
      { message: "AI Assistant could not answer right now." },
      { status: 502 },
    );
  }
}
