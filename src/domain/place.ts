import { z } from "zod";

export const majorCategories = ["음식", "장소"] as const;
export const primaryCategories = ["식당", "카페", "술집", "소품샵", "전시", "팝업"] as const;
export const alcoholTags = ["소주", "맥주", "막걸리", "와인", "칵테일", "위스키", "사케", "하이볼", "고량주"] as const;
export const statuses = ["검증 완료 · 지도 저장 대기", "지도 저장 완료", "검토 필요"] as const;

export type Place = {
  name: string; sourceUrl: string; region?: string; majorCategory: (typeof majorCategories)[number];
  primaryCategory: (typeof primaryCategories)[number]; secondaryCategory?: string;
  alcoholTags: (typeof alcoholTags)[number][]; keywords: string[]; mapUrl?: string; status: (typeof statuses)[number]; notionPageId?: string;
};

const allowed: Record<Place["primaryCategory"], { major: Place["majorCategory"]; secondary: readonly string[] }> = {
  식당: { major: "음식", secondary: ["한식", "양식", "중식", "일식", "퓨전", "기타"] },
  카페: { major: "음식", secondary: ["커피", "디저트", "베이커리"] },
  술집: { major: "음식", secondary: ["한식주점", "와인바", "칵테일바", "위스키바", "이자카야", "하이볼바", "중식주점"] },
  소품샵: { major: "장소", secondary: [] },
  전시: { major: "장소", secondary: ["미술", "사진", "체험형", "기타"] },
  팝업: { major: "장소", secondary: ["브랜드", "캐릭터/IP", "F&B", "기타"] }
};

const rawPlace = z.object({
  name: z.string().trim().min(1), sourceUrl: z.string().url(), region: z.string().trim().min(1).optional(),
  majorCategory: z.enum(majorCategories), primaryCategory: z.enum(primaryCategories),
  secondaryCategory: z.string().trim().min(1).optional(), alcoholTags: z.array(z.enum(alcoholTags)).default([]),
  keywords: z.array(z.string().trim().min(1)).default([]),
  mapUrl: z.string().url().optional(),
  status: z.enum(statuses).default("검증 완료 · 지도 저장 대기"), notionPageId: z.string().min(1).optional()
});

export function parsePlace(input: unknown): Place {
  const place = rawPlace.parse(input);
  const rule = allowed[place.primaryCategory];
  if (place.majorCategory !== rule.major) throw new Error(`${place.primaryCategory}의 대분류는 ${rule.major}이어야 합니다.`);
  if (rule.secondary.length === 0 && place.secondaryCategory) throw new Error(`${place.primaryCategory}에는 2차 카테고리를 지정할 수 없습니다.`);
  if (rule.secondary.length > 0 && !place.secondaryCategory) throw new Error(`${place.primaryCategory}에는 2차 카테고리가 필요합니다.`);
  if (place.secondaryCategory && !rule.secondary.includes(place.secondaryCategory)) throw new Error(`${place.primaryCategory}에 허용되지 않는 2차 카테고리입니다.`);
  if (place.primaryCategory !== "술집" && place.alcoholTags.length) throw new Error("주류 태그는 술집에만 지정할 수 있습니다.");
  return { ...place, alcoholTags: [...new Set(place.alcoholTags)], keywords: [...new Set(place.keywords)] };
}
