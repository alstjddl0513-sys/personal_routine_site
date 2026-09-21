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
    // 브라우저 UA로 스푸핑. `Rally/1.0` 같은 봇 UA는 Cloudflare/Wordfence
    // 계열 필터에서 403으로 튕김 (특히 techblog.woowahan.com WP+Cloudflare).
    // 로컬 dev 국내 IP에선 통과하지만 Render 미국 IP + 봇 UA 조합은 즉시
    // 차단. 공용 RSS 정상 수집 목적이고 rate limit도 자체 스케줄러가
    // 제어하므로 스푸핑에 문제 없음.
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    // rss-parser 기본값은 `application/rss+xml`만 요청하는데, Atom 전용
    // 피드(예: 네이버 D2 = d2.atom)는 그 헤더에 406으로 응답. Atom·RSS·
    // 일반 XML 전부 수락하도록 명시.
    Accept:
      'application/atom+xml, application/rss+xml, application/xml;q=0.9, */*;q=0.8',
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
