import { config } from 'dotenv';
import { resolve } from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { companies } from './schema';

config({ path: resolve(__dirname, '../../../../.env') });

type Type1 = 'big_tech' | 'sme' | 'startup' | 'foreign' | 'public';
type Type2 = 'service' | 'solution' | 'si' | 'inhouse' | 'lab' | 'freelance';
type Priority = 'important' | 'normal' | 'urgent';

interface SeedRow {
  name: string;
  type1: Type1;
  type2: Type2;
  priority: Priority;
}

const BIG_TECH_NAMES = new Set<string>([
  '토스',
  '카카오페이',
  '카카오뱅크',
  '토스인슈어런스',
  '카카오모빌리티',
  '배달의민족',
  '카카오엔터테인먼트',
  '네이버제트',
  '쿠팡',
  '카카오엔터프라이즈',
  '라인웍스',
  'CJ제일제당',
  'CJ올리브네트웍스',
  '현대오토에버',
  '기아',
  '롯데정보통신',
  '신세계아이앤씨',
  '이마트',
  'GS리테일',
  '삼성SDS(계열사 IT)',
  'LG전자 DX부문',
  'SK텔레콤 DT부문',
  '한화시스템',
  '두산디지털이노베이션',
  '포스코DX',
  '미래에셋증권 IT',
  '삼성카드 DT',
  '현대카드 개발조직',
  'LG CNS',
  'SK C&C',
  '삼성SDS(SI부문)',
  '포스코ICT',
  '롯데정보통신(SI부문)',
  '현대정보기술',
  '네이버랩스',
  '카카오브레인',
  'KT융합기술원',
  '삼성리서치',
  'LG AI연구원',
  'SK텔레콤 T3K',
  '현대모비스 자율주행연구소',
]);

const PUBLIC_NAMES = new Set<string>([
  '신한은행',
  '국민은행',
  '하나은행',
  '우리은행',
  '한전KDN',
  '국가수리과학연구소 산하 스타트업 랩',
]);

function assignType1(name: string): Type1 {
  if (BIG_TECH_NAMES.has(name)) return 'big_tech';
  if (PUBLIC_NAMES.has(name)) return 'public';
  return 'sme';
}

// priority: service/solution → important (기획서 "우선순위 상"), else normal ("하")
const SERVICE_NAMES = [
  '무신사',
  '마켓컬리',
  '오늘의집',
  '지그재그',
  '브랜디',
  '에이블리',
  '발란',
  '트렌비',
  '크림',
  '올웨이즈',
  '홈픽',
  '컬리테크',
  '오아시스마켓',
  '토스',
  '뱅크샐러드',
  '카카오페이',
  '카카오뱅크',
  '핀다',
  '페이히어',
  '삼쩜삼',
  '헤이비트',
  '두나무',
  '하이퍼커넥트',
  '토스인슈어런스',
  '렌딧',
  '8퍼센트',
  '카카오모빌리티',
  '쏘카',
  '그린카',
  '타다(VCNC)',
  '요기요',
  '배달의민족',
  '부릉(메쉬코리아)',
  '스파크플러스',
  '직방',
  '다방',
  '야놀자',
  '여기어때',
  '마이리얼트립',
  '인터파크트리플',
  '강남언니',
  '화해',
  '닥터나우',
  '굿닥',
  '똑닥',
  '루닛',
  '뷰노',
  '노을',
  '왓챠',
  '리디',
  '스푼라디오',
  '뮤직카우',
  '문피아',
  '카카오엔터테인먼트',
  '클래스101',
  '탈잉',
  '프립',
  '마이뮤직테이스트',
  '인프랩',
  '스나이퍼팩토리',
  '자란다',
  '멋쟁이사자처럼',
  '원티드랩',
  '잡플래닛',
  '사람인',
  '당근',
  '트레바리',
  '문토',
  '소모임',
  '스타일쉐어',
  '스노우',
  '네이버제트',
  '알스퀘어',
  '스페이스클라우드',
  '아워박스',
  '헤이딜러',
  '쿠팡',
  '카카오엔터프라이즈',
  '그린랩스',
  '오늘식탁',
  '로켓펀치',
  '데이블',
  '뤼이드',
  '두들린',
  '스푼랩스',
  '파킹클라우드',
];

const SOLUTION_NAMES = [
  '노션코리아',
  '채널톡',
  '아임웹',
  '잔디(토스랩)',
  '스윗(Swit)',
  '콜라보(collabo)',
  '마드라스체크(플로우)',
  '하이워크',
  '라인웍스',
  '센드버드',
  '리멤버(드라마앤컴퍼니)',
  '애자일소다',
  '웹케시',
  '카페24',
  '고도몰(NHN고도)',
  '메이크샵',
  '크리마',
  '채널마스터',
  '스무디',
  '애드브레인',
  '오픈서베이',
  '그로스빌',
  '뷰저블',
  '마크애니',
  'SGA솔루션즈',
  '이스트소프트',
  '파수',
  '플렉스',
  '자소설닷컴',
  '슈퍼브에이아이',
  '파운트',
];

const INHOUSE_NAMES = [
  '신한은행',
  '국민은행',
  '하나은행',
  '우리은행',
  'CJ제일제당',
  'CJ올리브네트웍스',
  '현대오토에버',
  '기아',
  '롯데정보통신',
  '신세계아이앤씨',
  '이마트',
  'GS리테일',
  '삼성SDS(계열사 IT)',
  'LG전자 DX부문',
  'SK텔레콤 DT부문',
  '한화시스템',
  '두산디지털이노베이션',
  '포스코DX',
  '미래에셋증권 IT',
  '삼성카드 DT',
  '현대카드 개발조직',
];

const SI_NAMES = [
  'LG CNS',
  'SK C&C',
  '쌍용정보통신',
  '유비쿼스',
  '삼성SDS(SI부문)',
  '대우정보시스템',
  '포스코ICT',
  '한전KDN',
  '코오롱베니트',
  '아시아나IDT',
  '롯데정보통신(SI부문)',
  '현대정보기술',
  '티맥스소프트',
  '이베스트투자증권 IT',
  '케이지이니시스',
];

const LAB_NAMES = [
  '네이버랩스',
  '카카오브레인',
  'KT융합기술원',
  '삼성리서치',
  'LG AI연구원',
  'SK텔레콤 T3K',
  '현대모비스 자율주행연구소',
  '라이너(Liner)',
  '업스테이지(Upstage)',
  '튜닙(Tunib)',
  '스캐터랩',
  '딥엑스',
  '넥스트유니콘 연구조직',
  '국가수리과학연구소 산하 스타트업 랩',
];

const FREELANCE_NAMES = [
  '크몽',
  '위시켓',
  '프리모아',
  '스튜디오좋',
  '얼반북스',
  '그루터',
];

function buildRows(): SeedRow[] {
  const rows: SeedRow[] = [];
  for (const name of SERVICE_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'service',
      priority: 'important',
    });
  }
  for (const name of SOLUTION_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'solution',
      priority: 'important',
    });
  }
  for (const name of INHOUSE_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'inhouse',
      priority: 'normal',
    });
  }
  for (const name of SI_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'si',
      priority: 'normal',
    });
  }
  for (const name of LAB_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'lab',
      priority: 'normal',
    });
  }
  for (const name of FREELANCE_NAMES) {
    rows.push({
      name,
      type1: assignType1(name),
      type2: 'freelance',
      priority: 'normal',
    });
  }
  return rows;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Check the root .env file.');
  }

  const rows = buildRows();
  const perType2 = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.type2] = (acc[r.type2] ?? 0) + 1;
    return acc;
  }, {});
  const perType1 = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.type1] = (acc[r.type1] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`Seed rows: ${rows.length}`);
  console.log('  by type2:', perType2);
  console.log('  by type1:', perType1);

  const client = postgres(url, { max: 1, prepare: false, ssl: 'require' });
  const db = drizzle(client);

  try {
    await db.delete(companies);
    console.log('Cleared companies.');
    await db.insert(companies).values(rows);
    console.log(`Inserted ${rows.length} companies.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
