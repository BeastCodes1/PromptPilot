import { NextResponse } from "next/server";
import { createDemoPlan } from "@/lib/demo-plan";
import { generatedPlanSchema, generationRequestSchema, planRefinementRequestSchema, type GeneratedPlan } from "@/lib/plan-schema";

export const runtime = "nodejs";
const maxRequestBytes = 40_000;

const systemPrompt = `You are PromptPilot, a pragmatic senior product engineer. Return only valid JSON with these exact fields: title, summary, projectType, targetAudience, problem, uniqueSellingPoint, mvpScope (3-7 strings), tasks (arrays named Setup, Core Features, Polish, Launch), codingPrompt. Each phase must contain respectively 2-5, 3-7, 2-5, and 2-5 tasks. Each task has title, description, priority (High, Medium, Low). Keep the plan specific, realistic, and coherent. The codingPrompt must include the recommended stack, key requirements, UI direction, and implementation order.`;

type Provider = "google" | "openai";

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > maxRequestBytes) {
    return NextResponse.json({ error: "That request is too large. Please shorten your idea and try again." }, { status: 413 });
  }

  let body: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "We couldn't read that request. Please try again." }, { status: 400 });
    }
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxRequestBytes) {
        try {
          await reader.cancel();
        } catch (error) {
          console.error("Could not cancel oversized plan request", error);
        }
        return NextResponse.json({ error: "That request is too large. Please shorten your idea and try again." }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return NextResponse.json({ error: "We couldn't read that request. Please try again." }, { status: 400 });
  }

  const refinementResult = planRefinementRequestSchema.safeParse(body);
  let isRefinement = false;
  let requestContent: string;
  let demoPlan: GeneratedPlan | null = null;
  if (refinementResult.success) {
    isRefinement = true;
    requestContent = `Refine the following existing project plan according to the user's instruction. Preserve its identity and all aspects not affected by the instruction. Return a complete replacement plan in the required JSON shape.\n\nCURRENT PLAN:\n${JSON.stringify(refinementResult.data.plan)}\n\nREFINEMENT INSTRUCTION:\n${refinementResult.data.instruction}`;
  } else {
    const generationResult = generationRequestSchema.safeParse(body);
    if (!generationResult.success) {
      return NextResponse.json({ error: generationResult.error.issues[0]?.message ?? "Please check your project idea." }, { status: 400 });
    }
    requestContent = `Requested project type: ${generationResult.data.projectType}\n\nIdea:\n${generationResult.data.idea}`;
    demoPlan = createDemoPlan(generationResult.data.idea, generationResult.data.projectType);
  }

  const configuredProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (configuredProvider && configuredProvider !== "google" && configuredProvider !== "openai") {
    return NextResponse.json({ error: "AI_PROVIDER must be set to either google or openai." }, { status: 500 });
  }

  const provider: Provider | null = configuredProvider === "google" || configuredProvider === "openai"
    ? configuredProvider
    : process.env.GOOGLE_API_KEY
      ? "google"
      : process.env.OPENAI_API_KEY
        ? "openai"
        : null;
  if (!provider) {
    if (isRefinement) {
      return NextResponse.json({ error: "Plan refinement needs an AI provider. Add a server API key; your saved plan has not changed." }, { status: 503 });
    }
    if (!demoPlan) {
      return NextResponse.json({ error: "The demo plan could not be prepared." }, { status: 500 });
    }
    return NextResponse.json({ plan: demoPlan, mode: "demo" });
  }

  const apiKey = provider === "google" ? process.env.GOOGLE_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const keyName = provider === "google" ? "GOOGLE_API_KEY" : "OPENAI_API_KEY";
    return NextResponse.json({ error: `Add ${keyName} to your server environment or select a provider with a configured key.` }, { status: 500 });
  }

  try {
    const isGoogle = provider === "google";
    const response = isGoogle
      ? await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(process.env.GOOGLE_MODEL || "gemini-2.5-flash")}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: requestContent }] }],
              generationConfig: { responseMimeType: "application/json", temperature: 0.6 },
            }),
            signal: AbortSignal.timeout(45_000),
          },
        )
      : await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            response_format: { type: "json_object" },
            temperature: 0.6,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: requestContent },
            ],
          }),
          signal: AbortSignal.timeout(45_000),
        });

    if (!response.ok) {
      console.error(`${provider} plan generation failed with status`, response.status);
      if (provider === "google" && response.status === 404) {
        return NextResponse.json({ error: "Google couldn't find this Gemini model. Check GOOGLE_MODEL and choose a model available to your API key." }, { status: 502 });
      }
      if (provider === "google" && response.status === 429) {
        return NextResponse.json({ error: "Gemini's free-tier quota or rate limit was reached. Wait a little and try again." }, { status: 503 });
      }
      if (provider === "google" && response.status === 503) {
        return NextResponse.json({ error: "Google Gemini is temporarily unavailable. Your idea is safe; please retry in a little while." }, { status: 503 });
      }
      if (provider === "google" && (response.status === 401 || response.status === 403)) {
        return NextResponse.json({ error: "Google rejected the API key or denied Gemini API access. Check the key and its Google AI Studio project." }, { status: 502 });
      }
      return NextResponse.json({ error: "The AI planner couldn't generate a plan right now. Please retry in a moment." }, { status: 502 });
    }

    const result: unknown = await response.json();
    const content = isGoogle ? getGeminiContent(result) : getOpenAIContent(result);
    if (!content) {
      console.error(`${provider} plan generation returned an empty response`);
      return NextResponse.json({ error: "The AI planner returned an incomplete response. Please retry." }, { status: 502 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error(`${provider} plan generation returned invalid JSON`);
      return NextResponse.json({ error: "The AI planner returned an unreadable plan. Please retry." }, { status: 502 });
    }

    const planResult = generatedPlanSchema.safeParse(parsed);
    if (!planResult.success) {
      console.error(`${provider} plan generation did not match the required plan schema`);
      return NextResponse.json({ error: "The AI planner returned an incomplete plan. Please retry." }, { status: 502 });
    }

    return NextResponse.json({ plan: planResult.data, mode: "ai" });
  } catch (error) {
    console.error(`${provider} plan generation request failed`, error);
    return NextResponse.json({ error: "We couldn't reach the AI planner. Check your connection and retry." }, { status: 502 });
  }
}

function getOpenAIContent(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const choices = (result as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return null;
  const message = choices[0]?.message as { content?: unknown } | undefined;
  return typeof message?.content === "string" ? message.content : null;
}

function getGeminiContent(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const candidates = (result as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates)) return null;
  const parts = (candidates[0]?.content as { parts?: unknown } | undefined)?.parts;
  if (!Array.isArray(parts)) return null;
  const text = parts
    .map((part: unknown) => part && typeof part === "object" ? (part as { text?: unknown }).text : null)
    .filter((part): part is string => typeof part === "string");
  return text.length ? text.join("") : null;
}
