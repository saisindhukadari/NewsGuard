import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AnalyzeInput = z.object({
  sourceType: z.enum(["url", "text"]),
  url: z.string().url().max(2048).optional(),
  text: z.string().max(50000).optional(),
});

export type AnalysisResult = {
  title: string;
  excerpt: string;
  summary: string;
  credibility_score: number;
  fake_news_probability: number;
  risk_level: "low" | "medium" | "high";
  category: "reliable" | "mostly_reliable" | "suspicious" | "potentially_fake";
  explanation: string;
  claims: {
    claim: string;
    verdict: "supported" | "unsupported" | "questionable" | "unverifiable";
    note: string;
  }[];
  indicators: {
    clickbait: number;
    sensational_language: number;
    source_transparency: number;
    evidence_quality: number;
    fake_news_probability: number;
    risk_level: "low" | "medium" | "high";
    political_bias?: number;
    emotional_language?: number;
    sensationalism?: number;
    fact_consistency?: "verified" | "partially_verified" | "unverified";
  };
  tips: string[];
  sourceUrl?: string;
};

const clamp = (value: unknown, fallback = 0, lo = 0, hi = 100) => {
  const numeric = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(lo, Math.min(hi, Math.round(numeric)));
};

type JsonRecord = Record<string, unknown>;
type ClaimVerdict = AnalysisResult["claims"][number]["verdict"];
type FactConsistency = NonNullable<AnalysisResult["indicators"]["fact_consistency"]>;

const toRecord = (value: unknown): JsonRecord =>
  value && typeof value === "object" ? (value as JsonRecord) : {};

const normalizeRiskLevel = (value: unknown, score: number): "low" | "medium" | "high" => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  if (["low", "medium", "high"].includes(normalized)) {
    return normalized as "low" | "medium" | "high";
  }
  return score >= 70 ? "low" : score >= 40 ? "medium" : "high";
};

const normalizeCategory = (value: unknown, score: number): AnalysisResult["category"] => {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  if (["reliable", "mostly_reliable", "suspicious", "potentially_fake"].includes(normalized)) {
    return normalized as AnalysisResult["category"];
  }
  if (score >= 80) return "reliable";
  if (score >= 60) return "mostly_reliable";
  if (score >= 35) return "suspicious";
  return "potentially_fake";
};

const extractJsonObject = (text: string): JsonRecord => {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI returned plain text instead of JSON.");
  }
  const json = cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");
  return toRecord(JSON.parse(json));
};

export const analyzeArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data, context }): Promise<{ id: string; result: AnalysisResult }> => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("AI is not configured.");

    let articleText = "";
    let articleTitle: string | undefined;
    let articleUrl: string | undefined;

    if (data.sourceType === "url") {
      if (!data.url) throw new Error("URL is required.");
      articleUrl = data.url;
      const firecrawlKey = process.env.FIRECRAWL_API_KEY;
      if (!firecrawlKey) throw new Error("Firecrawl is not configured.");
      const { default: Firecrawl } = await import("@mendable/firecrawl-js");
      const fc = new Firecrawl({ apiKey: firecrawlKey });
      try {
        const scraped = toRecord(
          await fc.scrape(data.url, {
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        );
        const scrapedData = toRecord(scraped.data);
        const metadata = toRecord(scraped.metadata);
        const dataMetadata = toRecord(scrapedData.metadata);
        articleText = String(scraped.markdown ?? scrapedData.markdown ?? "");
        articleTitle =
          typeof metadata.title === "string"
            ? metadata.title
            : typeof dataMetadata.title === "string"
              ? dataMetadata.title
              : undefined;
      } catch (err) {
        console.error("Firecrawl error", err);
        throw new Error("Could not fetch that URL. Try pasting the article text instead.");
      }
      if (!articleText || articleText.length < 80) {
        throw new Error("Couldn't extract enough content from that URL.");
      }
    } else {
      if (!data.text || data.text.trim().length < 80) {
        throw new Error("Please paste at least a few sentences.");
      }
      articleText = data.text.trim();
    }

    const truncated = articleText.slice(0, 12000);
    const { generateText } = await import("ai");
    const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
    const gateway = createLovableAiGatewayProvider(lovableKey);

    const schema = z.object({
      title: z.string().min(1),
      excerpt: z.string().min(1),
      summary: z.string().min(1),
      credibility_score: z.number(),
      fake_news_probability: z.number(),
      risk_level: z.enum(["low", "medium", "high"]),
      category: z.enum(["reliable", "mostly_reliable", "suspicious", "potentially_fake"]),
      explanation: z.string().min(1),
      claims: z.array(
        z.object({
          claim: z.string().min(1),
          verdict: z.enum(["supported", "unsupported", "questionable", "unverifiable"]),
          note: z.string(),
        }),
      ),
      indicators: z.object({
        clickbait: z.number(),
        sensational_language: z.number(),
        source_transparency: z.number(),
        evidence_quality: z.number(),
        fake_news_probability: z.number(),
        risk_level: z.enum(["low", "medium", "high"]),
        political_bias: z.number().optional(),
        emotional_language: z.number().optional(),
        sensationalism: z.number().optional(),
        fact_consistency: z.enum(["verified", "partially_verified", "unverified"]).optional(),
      }),
      tips: z.array(z.string()),
    });

    const system = `You are NewsGuard, an AI media-literacy assistant for students. Analyze articles for credibility, detect bias and misinformation patterns, extract claims, and give plain-language reasoning. Be balanced and educational, never preachy. Categories:
- reliable (80-100): well-sourced, neutral tone, verifiable facts
- mostly_reliable (60-79): generally credible with minor concerns
- suspicious (35-59): notable red flags, weak sourcing, biased framing
- potentially_fake (0-34): strong indicators of misinformation, fabricated or heavily distorted claims
Risk: low (credibility >= 70), medium (40-69), high (< 40). All numeric scores are 0-100 except political_bias which is -100..100.
Return ONLY valid JSON. Do not include markdown, explanations outside JSON, or code fences. Use snake_case field names exactly.`;

    const prompt = `Analyze the following article${articleUrl ? ` (URL: ${articleUrl})` : ""}.

ARTICLE:
${truncated}

Return ONLY one JSON object matching this exact schema. Missing or uncertain values must use safe defaults, not null:
{
  "title": "string",
  "excerpt": "string",
  "summary": "string",
  "credibility_score": 0,
  "fake_news_probability": 0,
  "risk_level": "low",
  "category": "reliable",
  "explanation": "string",
  "claims": [{ "claim": "string", "verdict": "supported", "note": "string" }],
  "indicators": {
    "clickbait": 0,
    "sensational_language": 0,
    "source_transparency": 0,
    "evidence_quality": 0,
    "fake_news_probability": 0,
    "risk_level": "low",
    "political_bias": 0,
    "emotional_language": 0,
    "sensationalism": 0,
    "fact_consistency": "unverified"
  },
  "tips": ["string"]
}
Allowed category values: reliable, mostly_reliable, suspicious, potentially_fake.
Allowed risk_level values: low, medium, high.
Allowed verdict values: supported, unsupported, questionable, unverifiable.
Allowed fact_consistency values: verified, partially_verified, unverified.`;

    let rawText = "";
    try {
      const result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt,
      });
      rawText = result.text ?? "";
      console.info("RAW AI RESPONSE:", rawText);
    } catch (err: unknown) {
      console.error("AI error", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("429")) {
        throw new Error("Rate limit reached. Try again in a minute.");
      }
      if (msg.includes("402")) {
        throw new Error("AI credits exhausted. Add credits in workspace settings.");
      }
      throw new Error(`Analysis failed: ${msg.slice(0, 200)}`);
    }

    let parsedResponse: JsonRecord = {};
    try {
      parsedResponse = extractJsonObject(rawText);
    } catch (err) {
      console.error("AI JSON parse failed", { error: err, rawResponse: rawText });
    }
    console.info("Parsed Response:", parsedResponse);

    const rawIndicators = toRecord(parsedResponse.indicators);
    const score = clamp(
      parsedResponse.credibility_score ??
        parsedResponse.credibilityScore ??
        parsedResponse.credibility,
      50,
    );
    const fakeNewsProbability = clamp(
      parsedResponse.fake_news_probability ??
        parsedResponse.fakeNewsProbability ??
        rawIndicators.fake_news_probability ??
        rawIndicators.fakeNewsProbability ??
        100 - score,
      100 - score,
    );
    const riskLevel = normalizeRiskLevel(
      parsedResponse.risk_level ?? parsedResponse.riskLevel ?? rawIndicators.risk_level,
      score,
    );
    const normalized = {
      title: String(parsedResponse.title || articleTitle || "Analyzed article"),
      excerpt: String(parsedResponse.excerpt || articleText.slice(0, 180)),
      summary: String(
        parsedResponse.summary ||
          "The AI returned an incomplete response, so NewsGuard saved a conservative analysis for review.",
      ),
      credibility_score: score,
      fake_news_probability: fakeNewsProbability,
      risk_level: riskLevel,
      category: normalizeCategory(parsedResponse.category, score),
      explanation: String(
        parsedResponse.explanation ||
          "AI response validation required fallback defaults because one or more expected fields were missing or malformed.",
      ),
      claims: Array.isArray(parsedResponse.claims)
        ? parsedResponse.claims.slice(0, 8).map((item: unknown) => {
            const claim = toRecord(item);
            const verdict = String(claim.verdict);
            return {
              claim: String(claim.claim || claim.text || "Claim could not be extracted."),
              verdict: ["supported", "unsupported", "questionable", "unverifiable"].includes(
                verdict,
              )
                ? (verdict as ClaimVerdict)
                : "unverifiable",
              note: String(claim.note || claim.reason || "No verification note was returned."),
            };
          })
        : [
            {
              claim: "No specific claims could be extracted from the AI response.",
              verdict: "unverifiable" as ClaimVerdict,
              note: "Review the article manually and check primary sources.",
            },
          ],
      indicators: {
        clickbait: clamp(rawIndicators.clickbait, 0),
        sensational_language: clamp(
          rawIndicators.sensational_language ?? rawIndicators.sensationalLanguage,
          0,
        ),
        source_transparency: clamp(
          rawIndicators.source_transparency ?? rawIndicators.sourceTransparency,
          50,
        ),
        evidence_quality: clamp(
          rawIndicators.evidence_quality ?? rawIndicators.evidenceQuality,
          50,
        ),
        fake_news_probability: fakeNewsProbability,
        risk_level: riskLevel,
        political_bias:
          rawIndicators.political_bias != null || rawIndicators.politicalBias != null
            ? clamp(rawIndicators.political_bias ?? rawIndicators.politicalBias, 0, -100, 100)
            : undefined,
        emotional_language:
          rawIndicators.emotional_language != null || rawIndicators.emotionalLanguage != null
            ? clamp(rawIndicators.emotional_language ?? rawIndicators.emotionalLanguage, 0)
            : undefined,
        sensationalism:
          rawIndicators.sensationalism != null ? clamp(rawIndicators.sensationalism, 0) : undefined,
        fact_consistency: ["verified", "partially_verified", "unverified"].includes(
          String(rawIndicators.fact_consistency ?? rawIndicators.factConsistency),
        )
          ? (String(
              rawIndicators.fact_consistency ?? rawIndicators.factConsistency,
            ) as FactConsistency)
          : "unverified",
      },
      tips:
        Array.isArray(parsedResponse.tips) && parsedResponse.tips.length > 0
          ? parsedResponse.tips.slice(0, 6).map((tip: unknown) => String(tip))
          : [
              "Check the original source.",
              "Compare the claim with at least two reputable outlets.",
              "Look for cited evidence and publication date.",
            ],
    };

    const validationResult = schema.safeParse(normalized);
    console.info(
      "Validation Result:",
      validationResult.success
        ? { success: true }
        : { success: false, issues: validationResult.error.issues },
    );
    const analysis = (
      validationResult.success ? validationResult.data : normalized
    ) as AnalysisResult;

    const { data: saved, error } = await context.supabase
      .from("analysis_reports")
      .insert({
        user_id: context.userId,
        source_type: data.sourceType,
        source_url: articleUrl ?? null,
        title: articleTitle ?? analysis.title,
        excerpt: analysis.excerpt,
        summary: analysis.summary,
        credibility_score: analysis.credibility_score,
        category: analysis.category,
        explanation: analysis.explanation,
        claims: analysis.claims,
        indicators: analysis.indicators,
        tips: analysis.tips,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB insert error", error);
      throw new Error("Couldn't save the report.");
    }

    return {
      id: saved.id,
      result: { ...analysis, title: articleTitle ?? analysis.title, sourceUrl: articleUrl },
    };
  });

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("analysis_reports")
      .select(
        "id,title,excerpt,credibility_score,category,source_url,source_type,bookmarked,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("analysis_reports")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Report not found.");
    return row;
  });

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; bookmarked: boolean }) =>
    z.object({ id: z.string().uuid(), bookmarked: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("analysis_reports")
      .update({ bookmarked: data.bookmarked })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("analysis_reports").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
