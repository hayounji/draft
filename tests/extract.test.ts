import { describe, expect, it } from "vitest";
import { parsePlace } from "../src/domain/place.js";

describe("extracted place normalization", () => {
  it("retains menu and neighbourhood keywords", () => {
    const place = parsePlace({ name: "카페 온화", sourceUrl: "https://example.com/p/1", region: "서울 성수동", majorCategory: "음식", primaryCategory: "카페", secondaryCategory: "디저트", keywords: ["팬케이크", "성수동"] });
    expect(place.keywords).toEqual(["팬케이크", "성수동"]);
  });
});
