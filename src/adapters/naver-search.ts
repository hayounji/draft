import type { Place } from "../domain/place.js";

type NaverItem = { title: string; category: string; address: string; roadAddress: string };
type NaverResponse = { items: NaverItem[] };
export type NaverSearchVerification = { place: Place; reason: string };

function plain(value: string): string { return value.replace(/<[^>]+>/g, "").replace(/\s+/g, "").trim().toLowerCase(); }

/** Verifies an extracted candidate. It never guesses among multiple local-search results. */
export async function verifyWithNaverLocal(place: Place, clientId: string, clientSecret: string): Promise<NaverSearchVerification> {
  const query = [place.name, place.region].filter(Boolean).join(" ");
  const response = await fetch(`https://openapi.naver.com/v1/search/local.json?display=5&query=${encodeURIComponent(query)}`, { headers: { "X-Naver-Client-Id": clientId, "X-Naver-Client-Secret": clientSecret } });
  if (!response.ok) return { place: { ...place, status: "검토 필요" }, reason: `네이버 지역검색 실패 (${response.status})` };
  const items = (await response.json() as NaverResponse).items;
  const exact = items.filter((item) => plain(item.title) === plain(place.name));
  if (exact.length !== 1) return { place: { ...place, status: "검토 필요" }, reason: exact.length === 0 ? "네이버 지역검색에서 동일한 장소를 찾지 못했습니다." : "네이버 지역검색 결과가 여러 개입니다." };
  return { place: { ...place, status: place.status === "검토 필요" ? "검토 필요" : "검증 완료 · 지도 저장 대기" }, reason: `네이버 지역검색 확인: ${exact[0].roadAddress || exact[0].address}` };
}
