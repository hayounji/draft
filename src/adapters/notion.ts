import { Client } from "@notionhq/client";
import type { Place } from "../domain/place.js";

export function toNotionProperties(place: Place) {
  return {
    Name: { title: [{ text: { content: place.name } }] },
    "원본 링크": { url: place.sourceUrl }, "대분류": { select: { name: place.majorCategory } },
    "1차 카테고리": { select: { name: place.primaryCategory } },
    "2차 카테고리": { select: place.secondaryCategory ? { name: place.secondaryCategory } : null },
    "주류 태그": { multi_select: place.alcoholTags.map((name) => ({ name })) },
    "키워드": { multi_select: place.keywords.map((name) => ({ name })) }, "지도 링크": { url: place.mapUrl ?? null }, "상태": { select: { name: place.status } }
  };
}

export async function createNotionPlace(client: Client, databaseId: string, place: Place): Promise<string> {
  const page = await client.pages.create({ parent: { database_id: databaseId }, properties: toNotionProperties(place) } as never);
  return page.id;
}

export async function updateNotionStatus(client: Client, pageId: string, status: Place["status"]): Promise<void> {
  await client.pages.update({ page_id: pageId, properties: { "상태": { select: { name: status } } } } as never);
}
