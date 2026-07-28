import { z } from "zod";
import { parsePlace, type Place } from "../domain/place.js";
import type { PublicLinkEvidence } from "./public-link.js";

const extractedPlace = z.object({
  name: z.string().min(1), region: z.string().min(1).optional(), majorCategory: z.enum(["음식", "장소"]),
  primaryCategory: z.enum(["식당", "카페", "술집", "소품샵", "전시", "팝업"]), secondaryCategory: z.string().optional(),
  alcoholTags: z.array(z.enum(["소주", "맥주", "막걸리", "와인", "칵테일", "위스키", "사케", "하이볼", "고량주"])).default([]),
  keywords: z.array(z.string()).default([]), mapUrl: z.string().url().optional(), confidence: z.enum(["high", "low"]), reason: z.string().min(1)
});
const extractionSchema = z.object({ places: z.array(extractedPlace) });

export type ExtractedPlace = Place & { confidence: "high" | "low"; extractionReason: string };
export interface LinkExtractor { extract(url: string, evidence?: PublicLinkEvidence): Promise<ExtractedPlace[]>; }

function responseText(response: { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }): string {
  return response.output?.flatMap((item) => item.content ?? []).filter((item) => item.type === "output_text").map((item) => item.text ?? "").join("") ?? "";
}

function jsonFromModelText(text: string): unknown {
  const unfenced = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(unfenced);
}

/** Reads only the user-submitted URL through OpenAI web search. It never supplies credentials or retries blocked content. */
export function createOpenAiLinkExtractor(apiKey: string): LinkExtractor {
  return {
    async extract(url, evidence) {
      const signals = evidence ? JSON.stringify(evidence) : "No direct metadata was available.";
      const prompt = `The user explicitly submitted this public SNS or web URL: ${url}\nStructured signals collected from that exact URL: ${signals}\nUse only publicly accessible content from the submitted page; do not log in, bypass any restriction, or infer unavailable text. Prioritize an explicit map URL, geotag/place information, then venue mentions. Extract every explicitly named visitable venue and useful Korean keywords (menu, neighborhood, theme: e.g. 팬케이크, 성수동). A direct map URL may be copied into mapUrl. If content is inaccessible or a venue/category is ambiguous, return a single low-confidence candidate only when a name is explicitly present; otherwise return an empty list. Return ONLY a JSON object with this exact shape and no Markdown: {"places":[{"name":"string","region":"string optional","majorCategory":"음식|장소","primaryCategory":"식당|카페|술집|소품샵|전시|팝업","secondaryCategory":"string optional","alcoholTags":["string"],"keywords":["string"],"mapUrl":"URL optional","confidence":"high|low","reason":"string"}]}.`;
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-5-mini", tools: [{ type: "web_search" }], input: prompt })
      });
      if (!res.ok) throw new Error(`OpenAI 추출 요청 실패: ${res.status} ${await res.text()}`);
      const text = responseText(await res.json() as { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> });
      let parsed: unknown;
      try { parsed = jsonFromModelText(text); } catch { throw new Error("AI가 유효한 JSON 추출 결과를 반환하지 않았습니다."); }
      return extractionSchema.parse(parsed).places.map((candidate) => {
        const status: Place["status"] = candidate.confidence === "high" ? "검증 완료 · 지도 저장 대기" : "검토 필요";
        return { ...parsePlace({ ...candidate, sourceUrl: url, status }), confidence: candidate.confidence, extractionReason: candidate.reason };
      });
    }
  };
}
