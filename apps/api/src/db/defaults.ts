// Onboarding defaults — stamped with the caller's owner_id at insert time.
// Consumed by profiles.service.upsertMe (new signup) and the seed scripts.

export interface DefaultCompanyType {
  key: string;
  label: string;
  sortOrder: number;
  isDefault: boolean;
}

export const DEFAULT_COMPANY_TYPES: readonly DefaultCompanyType[] = [
  { key: 'service', label: '서비스', sortOrder: 0, isDefault: true },
  { key: 'solution', label: '솔루션', sortOrder: 1, isDefault: true },
  { key: 'si', label: 'SI', sortOrder: 2, isDefault: true },
  { key: 'inhouse', label: '인하우스', sortOrder: 3, isDefault: true },
  { key: 'lab', label: '랩', sortOrder: 4, isDefault: true },
  { key: 'freelance', label: '프리랜서', sortOrder: 5, isDefault: true },
] as const;

export interface DefaultExercise {
  name: string;
  targetMuscle: string;
  defaultSets: number;
  repMin: number;
  repMax: number;
}

export const DEFAULT_EXERCISES: readonly DefaultExercise[] = [
  { name: '랫풀다운', targetMuscle: 'back', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '벤치프레스', targetMuscle: 'chest', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '숄더프레스', targetMuscle: 'shoulder', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '케이블·머신 로우', targetMuscle: 'back', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '레터럴 레이즈', targetMuscle: 'shoulder', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '바벨 스쿼트', targetMuscle: 'leg', defaultSets: 3, repMin: 6, repMax: 10 },
  { name: '레그프레스', targetMuscle: 'leg', defaultSets: 3, repMin: 10, repMax: 15 },
  { name: '루마니안 데드리프트', targetMuscle: 'leg', defaultSets: 3, repMin: 8, repMax: 12 },
  { name: '레그 익스텐션', targetMuscle: 'leg', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '레그 컬', targetMuscle: 'leg', defaultSets: 3, repMin: 12, repMax: 15 },
  { name: '스탠딩 카프 레이즈', targetMuscle: 'leg', defaultSets: 3, repMin: 15, repMax: 20 },
] as const;

export interface DefaultBlogSource {
  name: string;
  rssUrl: string;
  siteUrl?: string;
}

export const DEFAULT_BLOG_SOURCES: readonly DefaultBlogSource[] = [
  { name: '카카오 tech', rssUrl: 'https://tech.kakao.com/feed/', siteUrl: 'https://tech.kakao.com' },
  { name: '우아한형제들', rssUrl: 'https://techblog.woowahan.com/feed/', siteUrl: 'https://techblog.woowahan.com' },
  { name: '토스', rssUrl: 'https://toss.tech/rss.xml', siteUrl: 'https://toss.tech' },
  { name: '라인', rssUrl: 'https://engineering.linecorp.com/ko/feed/', siteUrl: 'https://engineering.linecorp.com/ko' },
  { name: '당근', rssUrl: 'https://medium.com/feed/daangn', siteUrl: 'https://medium.com/daangn' },
  { name: '쿠팡', rssUrl: 'https://medium.com/feed/coupang-engineering', siteUrl: 'https://medium.com/coupang-engineering' },
  { name: '카카오페이', rssUrl: 'https://tech.kakaopay.com/rss', siteUrl: 'https://tech.kakaopay.com' },
  { name: '네이버 D2', rssUrl: 'https://d2.naver.com/d2.atom', siteUrl: 'https://d2.naver.com' },
] as const;
