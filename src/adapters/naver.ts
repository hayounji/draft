import { chromium } from "playwright";
import type { Place } from "../domain/place.js";

export type NaverSaveResult =
  | { status: "지도 저장 완료" }
  | { status: "검토 필요"; reason: string };

export interface NaverMapRunner {
  saveSearchResult(searchUrl: string): Promise<NaverSaveResult>;
}

export function buildNaverSearchUrl(place: Pick<Place, "name" | "region">): string {
  const query = [place.name, place.region].filter(Boolean).join(" ");
  return `https://map.naver.com/p/search/${encodeURIComponent(query)}`;
}

export function assertConfirmed(confirm: boolean): void {
  if (!confirm) throw new Error("네이버지도 저장은 명시적 --confirm 옵션이 필요합니다.");
}

export async function stageNaverSave(place: Place, confirm: boolean, runner: NaverMapRunner): Promise<NaverSaveResult> {
  assertConfirmed(confirm);
  if (place.status !== "검증 완료 · 지도 저장 대기") return { status: "검토 필요", reason: "지도 저장 대기 상태인 장소만 저장할 수 있습니다." };
  return runner.saveSearchResult(buildNaverSearchUrl(place));
}

/** Uses an already signed-in local Chrome profile. Never supply credentials here. */
export function createPlaywrightNaverRunner(userDataDir: string): NaverMapRunner {
  return {
    async saveSearchResult(searchUrl) {
      const context = await chromium.launchPersistentContext(userDataDir, { channel: "chrome", headless: false });
      try {
        const page = context.pages()[0] ?? await context.newPage();
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
        // Naver Map is a third-party UI. Do not guess on ambiguous results; require one visible result and an explicit save control.
        const results = page.locator("a[href*='/place/']");
        if (await results.count() !== 1) return { status: "검토 필요", reason: "검색 결과가 하나로 확정되지 않았습니다." };
        await results.first().click();
        const saveButton = page.getByRole("button", { name: /저장|관심/ });
        if (await saveButton.count() !== 1) return { status: "검토 필요", reason: "관심장소 저장 UI를 안전하게 찾지 못했습니다." };
        await saveButton.click();
        return { status: "지도 저장 완료" };
      } catch (error) {
        return { status: "검토 필요", reason: error instanceof Error ? error.message : "네이버지도 저장 중 알 수 없는 오류" };
      } finally { await context.close(); }
    }
  };
}
