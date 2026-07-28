import { afterEach, describe, expect, it, vi } from "vitest";
import { readPublicLink } from "../src/adapters/public-link.js";

afterEach(() => vi.unstubAllGlobals());

describe("public link reader", () => {
  it("collects public metadata, map URLs, and mentions without login", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(`
      <meta property="og:title" content="성수 팬케이크 카페" />
      <meta property="og:description" content="@cafeonhwa 방문" />
      <a href="https://map.naver.com/p/search/%EC%98%A8%ED%99%94">map</a>`, { status: 200 })));
    await expect(readPublicLink("https://example.com/post")).resolves.toMatchObject({ available: true, title: "성수 팬케이크 카페", mentions: ["@cafeonhwa"] });
  });
});
