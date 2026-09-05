import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { blogSources } from './schema';

config({ path: resolve(__dirname, '../../../../.env') });

interface SourceSeed {
  name: string;
  rssUrl: string;
  siteUrl?: string;
}

// 추천 8개. refresh 시 실패하는 것은 UI에서 개별 수정/삭제.
const SEED: SourceSeed[] = [
  { name: '카카오 tech', rssUrl: 'https://tech.kakao.com/feed/', siteUrl: 'https://tech.kakao.com' },
  { name: '우아한형제들', rssUrl: 'https://techblog.woowahan.com/feed/', siteUrl: 'https://techblog.woowahan.com' },
  { name: '토스', rssUrl: 'https://toss.tech/rss.xml', siteUrl: 'https://toss.tech' },
  { name: '라인', rssUrl: 'https://engineering.linecorp.com/ko/feed/', siteUrl: 'https://engineering.linecorp.com/ko' },
  { name: '당근', rssUrl: 'https://medium.com/feed/daangn', siteUrl: 'https://medium.com/daangn' },
  { name: '쿠팡', rssUrl: 'https://medium.com/feed/coupang-engineering', siteUrl: 'https://medium.com/coupang-engineering' },
  { name: '카카오페이', rssUrl: 'https://tech.kakaopay.com/rss', siteUrl: 'https://tech.kakaopay.com' },
  { name: '네이버 D2', rssUrl: 'https://d2.naver.com/d2.atom', siteUrl: 'https://d2.naver.com' },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }

  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(client);

  try {
    const existing = await db
      .select({ rssUrl: blogSources.rssUrl, sortOrder: blogSources.sortOrder })
      .from(blogSources);
    const existingUrls = new Set(existing.map((r) => r.rssUrl));
    const maxSortOrder = existing.reduce(
      (max, r) => (r.sortOrder > max ? r.sortOrder : max),
      -1,
    );

    const missing = SEED.filter((s) => !existingUrls.has(s.rssUrl));
    if (missing.length === 0) {
      console.log(`All ${SEED.length} seed sources already present. Nothing to do.`);
      return;
    }

    const rows = missing.map((s, i) => ({
      ...s,
      sortOrder: maxSortOrder + 1 + i,
    }));
    await db.insert(blogSources).values(rows);
    console.log(
      `Inserted ${rows.length} new sources (sort_order ${maxSortOrder + 1}~${maxSortOrder + rows.length}):`,
    );
    for (const r of rows) console.log(`  + ${r.name}  ${r.rssUrl}`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
