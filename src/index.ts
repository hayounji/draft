import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import { Client } from "@notionhq/client";
import { parsePlace, type Place } from "./domain/place.js";
import { createNotionPlace, updateNotionStatus } from "./adapters/notion.js";
import { createPlaywrightNaverRunner, stageNaverSave } from "./adapters/naver.js";
import { createOpenAiLinkExtractor } from "./adapters/extract.js";
import { readPublicLink } from "./adapters/public-link.js";

async function loadPlaces(path: string): Promise<Place[]> {
  const input: unknown = JSON.parse(await readFile(path, "utf8"));
  const entries = Array.isArray(input) ? input : (input as { places?: unknown }).places;
  if (!Array.isArray(entries)) throw new Error("JSON 최상위 값은 장소 배열 또는 { places: [...] }여야 합니다.");
  return entries.map(parsePlace);
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 필요합니다.`);
  return value;
}

async function main(): Promise<void> {
  const [command, file, ...flags] = process.argv.slice(2);
  if (!command || !file || !["extract", "validate", "create-notion", "save-naver"].includes(command)) {
    throw new Error("사용법: place <extract|validate|create-notion|save-naver> <URL 또는 places.json> [--out places.json] [--confirm]");
  }
  if (command === "extract") {
    const evidence = await readPublicLink(file);
    const extracted = await createOpenAiLinkExtractor(requiredEnv("OPENAI_API_KEY")).extract(file, evidence);
    // Without a verified map API result, extraction is always a review artifact, never a save-ready record.
    const results = extracted.map((item) => ({ ...item, status: "검토 필요" as const, extractionReason: `${item.extractionReason} / 공개 정보와 AI 추출 결과이므로 사람 검토가 필요합니다.` }));
    const json = JSON.stringify(results, null, 2);
    const outIndex = flags.indexOf("--out");
    if (outIndex >= 0) {
      const outPath = flags[outIndex + 1];
      if (!outPath) throw new Error("--out 뒤에 저장할 JSON 경로가 필요합니다.");
      await writeFile(outPath, `${json}\n`, "utf8");
      console.log(`추출 결과 ${results.length}개를 ${outPath}에 저장했습니다.`);
    } else console.log(json);
    return;
  }
  const places = await loadPlaces(file);
  if (command === "validate") { console.log(`검증 완료: ${places.length}개 장소`); return; }
  if (command === "create-notion") {
    const client = new Client({ auth: requiredEnv("NOTION_API_KEY") });
    const databaseId = requiredEnv("NOTION_DATABASE_ID");
    for (const place of places) console.log(`${place.name}\t${await createNotionPlace(client, databaseId, place)}`);
    return;
  }
  const runner = createPlaywrightNaverRunner(requiredEnv("NAVER_USER_DATA_DIR"));
  const client = process.env.NOTION_API_KEY ? new Client({ auth: process.env.NOTION_API_KEY }) : undefined;
  for (const place of places) {
    const result = await stageNaverSave(place, flags.includes("--confirm"), runner);
    if (client && place.notionPageId) await updateNotionStatus(client, place.notionPageId, result.status);
    console.log(`${place.name}\t${result.status}${"reason" in result ? `\t${result.reason}` : ""}`);
  }
}

main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
