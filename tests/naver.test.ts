import { describe, expect, it, vi } from "vitest";
import { assertConfirmed, buildNaverSearchUrl, stageNaverSave, type NaverMapRunner } from "../src/adapters/naver.js";
import type { Place } from "../src/domain/place.js";

const place: Place = { name: "테스트 카페", sourceUrl: "https://example.com/post", region: "서울 성수동", majorCategory: "음식", primaryCategory: "카페", secondaryCategory: "커피", alcoholTags: [], keywords: [], status: "검증 완료 · 지도 저장 대기" };

describe("Naver staging", () => {
  it("builds an encoded search URL from name and region", () => {
    expect(buildNaverSearchUrl(place)).toBe("https://map.naver.com/p/search/%ED%85%8C%EC%8A%A4%ED%8A%B8%20%EC%B9%B4%ED%8E%98%20%EC%84%9C%EC%9A%B8%20%EC%84%B1%EC%88%98%EB%8F%99");
  });
  it("requires explicit confirmation", () => {
    expect(() => assertConfirmed(false)).toThrow("--confirm");
  });
  it("passes the search URL to runner and returns its successful transition", async () => {
    const runner: NaverMapRunner = { saveSearchResult: vi.fn().mockResolvedValue({ status: "지도 저장 완료" }) };
    await expect(stageNaverSave(place, true, runner)).resolves.toEqual({ status: "지도 저장 완료" });
    expect(runner.saveSearchResult).toHaveBeenCalledWith(buildNaverSearchUrl(place));
  });
  it("keeps uncertain runner outcomes in review", async () => {
    const runner: NaverMapRunner = { saveSearchResult: vi.fn().mockResolvedValue({ status: "검토 필요", reason: "동명이인" }) };
    await expect(stageNaverSave(place, true, runner)).resolves.toEqual({ status: "검토 필요", reason: "동명이인" });
  });
});
