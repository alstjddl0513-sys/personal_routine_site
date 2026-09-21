import Parser from 'rss-parser';

export interface RssItem {
  title: string;
  url: string;
  summary: string | null;
  publishedAt: Date | null;
}

// summary 최대 길이. RSS content가 길면 이 정도로 잘라 저장.
const SUMMARY_MAX = 200;

const parser = new Parser({
  timeout: 10000,
  headers: {
    // 실제 Chrome이 보내는 헤더 셋 전체를 흉내. v1.1.1에서 UA만 브라우저로
    // 바꿨는데 우아한형제들이 여전히 403 → Cloudflare/Wordfence가 헤더 조합
    // 지문(fingerprint)까지 검사한다는 뜻. Sec-Fetch-* + Accept-Language +
    // Accept-Encoding 등을 더해서 진짜 브라우저 요청처럼 위장.
    //
    // 이걸로도 안 되면 Bot Fight Mode(JS challenge)가 걸린 것 — 그때는
    // 우아한형제들 소스 자체를 disable하는 게 실용적 (Cloudflare Workers
    // 프록시 세팅은 오버킬).
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // rss-parser 기본값은 `application/rss+xml`만 요청하는데, Atom 전용
    // 피드(예: 네이버 D2 = d2.atom)는 그 헤더에 406으로 응답. Atom·RSS·
    // 일반 XML 전부 수락하도록 명시.
    Accept:
      'application/atom+xml, application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
    'Sec-Ch-Ua':
      '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  },
});

export async function fetchRssItems(rssUrl: string): Promise<RssItem[]> {
  const feed = await parser.parseURL(rssUrl);
  const items: RssItem[] = [];
  for (const it of feed.items) {
    const title = it.title?.trim();
    const url = it.link?.trim();
    if (!title || !url) continue;

    const snippet =
      it.contentSnippet?.trim() ??
      (it.content ? stripHtml(it.content).trim() : '');
    const summary = snippet ? truncate(snippet, SUMMARY_MAX) : null;

    const dateStr = it.isoDate ?? it.pubDate;
    const published = dateStr ? new Date(dateStr) : null;
    const publishedAt = published && !isNaN(published.getTime()) ? published : null;

    items.push({ title, url, summary, publishedAt });
  }
  return items;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…';
}
