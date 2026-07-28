export type PublicLinkEvidence = {
  canonicalUrl: string;
  title?: string;
  description?: string;
  mapUrls: string[];
  mentions: string[];
  available: boolean;
};

const mapDomains = ["map.naver.com", "naver.me", "maps.google.", "goo.gl/maps", "place.map.kakao.com", "map.kakao.com"];

function isPublicHttpUrl(value: string): boolean {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  return (url.protocol === "https:" || url.protocol === "http:") && host !== "localhost" && !host.startsWith("127.") && !host.startsWith("10.") && !host.startsWith("192.168.");
}

function attribute(html: string, property: string): string | undefined {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"));
  return match?.[1]?.replaceAll("&amp;", "&");
}

/** Reads one user-submitted, login-free public page. Blocked pages are reported, never bypassed. */
export async function readPublicLink(url: string): Promise<PublicLinkEvidence> {
  if (!isPublicHttpUrl(url)) throw new Error("http 또는 https 공개 링크만 사용할 수 있습니다.");
  try {
    const response = await fetch(url, { redirect: "follow", headers: { Accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) return { canonicalUrl: url, mapUrls: [], mentions: [], available: false };
    const html = (await response.text()).slice(0, 1_000_000);
    const urls = [...html.matchAll(/https?:\/\/[^"'<>\s]+/g)].map((match) => match[0].replaceAll("\\/", "/"));
    const mapUrls = [...new Set(urls.filter((value) => mapDomains.some((domain) => new URL(value).hostname.includes(domain))))];
    const mentions = [...new Set((html.match(/(?<![\w@])@[A-Za-z0-9_.]{1,30}/g) ?? []).slice(0, 20))];
    return { canonicalUrl: response.url, title: attribute(html, "og:title") ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(), description: attribute(html, "og:description") ?? attribute(html, "description"), mapUrls, mentions, available: true };
  } catch { return { canonicalUrl: url, mapUrls: [], mentions: [], available: false }; }
}
