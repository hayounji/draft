import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyWithNaverLocal } from "../src/adapters/naver-search.js";
import type { Place } from "../src/domain/place.js";

const place: Place = { name: "카페 온화", sourceUrl: "https://example.com", region: "서울 성수동", majorCategory: "음식", primaryCategory: "카페", secondaryCategory: "디저트", alcoholTags: [], keywords: ["팬케이크"], status: "검증 완료 · 지도 저장 대기" };
afterEach(() => vi.unstubAllGlobals());

describe("Naver Local verification", () => {
  it("moves one exact local result to the save queue", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [{ title: "<b>카페 온화</b>", category: "카페", address: "서울", roadAddress: "서울 성수동" }] }), { status: 200 })));
    await expect(verifyWithNaverLocal(place, "id", "secret")).resolves.toMatchObject({ place: { status: "검증 완료 · 지도 저장 대기" } });
  });
  it("marks unmatched results for review", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [] }), { status: 200 })));
    await expect(verifyWithNaverLocal(place, "id", "secret")).resolves.toMatchObject({ place: { status: "검토 필요" } });
  });
});
