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

export interface DefaultQuestion {
  content: string;
  answer: string;
}

// CS interview 기초. 분포: CS기초 8 · 네트워크 5 · DB 4 · 백엔드 7 · 프론트 6.
// 태그/카테고리는 Phase 1b 이후. 지금은 pool에서 무작위.
export const DEFAULT_QUESTIONS: readonly DefaultQuestion[] = [
  {
    content: 'Stack과 Queue의 차이는?',
    answer:
      'Stack은 LIFO(Last In First Out) — 마지막에 넣은 걸 먼저 뺀다. Queue는 FIFO(First In First Out) — 먼저 넣은 걸 먼저 뺀다. Stack은 함수 호출 스택·되돌리기 등에, Queue는 작업 대기열·BFS 탐색 등에 쓰인다.',
  },
  {
    content: '해시테이블의 시간복잡도와 충돌 처리 방식은?',
    answer:
      '평균 O(1) 조회/삽입/삭제, 최악 O(n)(모든 키가 같은 버킷). 충돌 처리는 크게 체이닝(같은 버킷을 연결리스트로)과 오픈 어드레싱(다음 빈 슬롯 탐색)이 있다. 부하 계수(load factor)가 임계를 넘으면 재해싱으로 버킷을 늘린다.',
  },
  {
    content: 'Big-O 표기법이 뜻하는 것은?',
    answer:
      '입력 크기 n이 커질 때 알고리즘 실행 시간(또는 공간)의 상한을 나타내는 점근 표기. 상수·저차항을 무시하고 성장률만 본다. 예: 이중 반복문은 O(n²), 이진 탐색은 O(log n).',
  },
  {
    content: '배열 vs 연결리스트, 언제 뭘 쓰나?',
    answer:
      '배열은 인덱스 접근 O(1)이라 랜덤 접근이 잦으면 유리, 중간 삽입/삭제는 O(n). 연결리스트는 반대로 순차 접근 O(n)이지만 노드 참조를 알면 삽입/삭제가 O(1). 캐시 지역성은 배열이 훨씬 좋아 실전에서는 배열이 자주 이긴다.',
  },
  {
    content: '이진 탐색이 성립하는 조건과 시간복잡도는?',
    answer:
      '배열이 정렬되어 있어야 하고, 랜덤 접근이 가능해야 한다. 매 단계마다 탐색 범위를 반씩 줄여 O(log n)이다. 값이 없어도 lower_bound로 삽입 위치를 O(log n)에 찾을 수 있다.',
  },
  {
    content: '프로세스와 스레드의 차이는?',
    answer:
      '프로세스는 독립된 메모리 공간을 갖는 실행 단위, 스레드는 프로세스 안에서 메모리(힙·코드)를 공유하는 실행 흐름이다. 컨텍스트 스위칭 비용은 스레드가 훨씬 싸지만, 스레드끼리는 동기화 문제(race condition, deadlock)를 신경써야 한다.',
  },
  {
    content: 'Race condition과 이를 막는 방법은?',
    answer:
      '여러 스레드/프로세스가 공유 자원에 동시에 접근·수정할 때 실행 순서에 따라 결과가 달라지는 현상. Mutex/Lock으로 임계 영역을 직렬화하거나, atomic 연산·CAS(Compare-And-Swap), 락 프리 자료구조로 방어한다. DB에선 트랜잭션·격리 수준·낙관/비관 락으로 다룬다.',
  },
  {
    content: '스택 오버플로우가 나는 대표적인 원인은?',
    answer:
      '재귀 호출이 종료 조건 없이 반복될 때 콜 스택이 한계까지 쌓여 발생. 매우 깊은 호출(파일 트리 순회 등)에서도 날 수 있어, 재귀를 반복문으로 바꾸거나 tail-call/명시적 스택으로 우회한다. 언어에 따라 스택 크기 조정도 가능하지만 근본 해결은 아니다.',
  },
  {
    content: 'TCP와 UDP의 차이는?',
    answer:
      'TCP는 연결 지향(3-way handshake)이고 순서·재전송·흐름 제어를 보장한다. UDP는 비연결·비신뢰, 헤더가 작고 지연이 낮다. 파일 전송·웹은 TCP, 실시간 게임·음성/영상 스트리밍은 UDP(또는 QUIC).',
  },
  {
    content: 'HTTP status 200/301/400/401/403/404/500 각각 언제 쓰나?',
    answer:
      '200 성공, 301 영구 리다이렉트(캐시됨), 400 잘못된 요청(형식 오류), 401 인증 안 됨(로그인 필요), 403 인증됐지만 권한 없음, 404 리소스 없음, 500 서버 내부 오류. 401 vs 403 구분이 중요: 로그인 여부가 401, 권한 여부가 403.',
  },
  {
    content: 'HTTPS는 어떻게 통신을 보호하는가?',
    answer:
      'TLS 핸드셰이크로 서버 인증서를 검증하고 대칭키를 교환한다. 이후 데이터는 대칭키로 암호화되어 도청·변조·위장을 막는다. 서명·인증서 체인으로 신뢰(Chain of trust)를 형성하며, 최신은 TLS 1.3(1-RTT 또는 0-RTT)이 표준.',
  },
  {
    content: 'DNS는 무엇이고 조회 순서는?',
    answer:
      '도메인 이름을 IP 주소로 변환하는 분산 시스템. 브라우저 캐시 → OS 캐시 → resolver(ISP) → root → TLD(.com) → authoritative 순으로 위임된다. 결과는 TTL 동안 캐싱된다.',
  },
  {
    content: 'CORS는 왜 필요하고 어떻게 동작하나?',
    answer:
      '브라우저의 same-origin 정책으로 다른 origin의 응답을 JS가 읽지 못하게 막는 게 기본. CORS는 서버가 `Access-Control-Allow-Origin` 등 헤더로 명시적으로 허용해 우회한다. non-simple 요청은 브라우저가 먼저 OPTIONS(preflight)로 허용 여부를 확인한다.',
  },
  {
    content: '트랜잭션의 ACID 각 속성은?',
    answer:
      'Atomicity(원자성) 전부 성공 or 전부 롤백, Consistency(일관성) 제약 조건 항상 유지, Isolation(격리성) 동시 트랜잭션이 서로 간섭 안 함, Durability(지속성) 커밋 후엔 장애가 나도 반영 유지. 격리 수준(RC/RR/Serializable)이 실전에서 tradeoff의 핵심.',
  },
  {
    content: '인덱스는 왜 조회는 빨라지고 쓰기는 느려지나?',
    answer:
      '인덱스는 정렬된 별도 자료구조(B-tree 등)를 유지하기 때문에 특정 컬럼 검색을 O(log n)에 처리한다. 대신 INSERT/UPDATE/DELETE 시 인덱스도 갱신해야 해 쓰기 비용이 늘고 디스크 공간을 추가로 쓴다. 자주 조회하는 컬럼, 카디널리티 높은 컬럼에 우선 걸어야 이득.',
  },
  {
    content: 'RDB의 정규화란? 언제 역정규화를 고려하나?',
    answer:
      '중복 데이터를 없애고 이상현상(update/insert/delete anomaly)을 막기 위해 테이블을 쪼개는 과정(1NF ~ BCNF). 조인이 많아져 읽기 성능이 병목이 되면 역정규화로 데이터를 복제·중복 컬럼을 두어 조인을 줄인다. OLAP·리포트성 워크로드에서 흔함.',
  },
  {
    content: 'N+1 문제란 무엇이고 어떻게 해결하는가?',
    answer:
      '리스트를 가져온 뒤 각 항목의 연관 엔티티를 개별 쿼리로 조회해 총 1+N번 쿼리가 발생하는 문제. ORM의 지연 로딩이 원인일 때가 많다. JOIN, IN절 batch fetch, DataLoader(GraphQL) 등으로 한 번에 묶어 해결한다.',
  },
  {
    content: 'REST의 핵심 원칙 몇 가지만 말해달라.',
    answer:
      '(1) 자원 중심 URI 설계 — 동사 대신 명사 (2) HTTP 메서드로 동작 표현 — GET/POST/PUT/PATCH/DELETE (3) 무상태(stateless) — 요청마다 필요한 정보를 모두 담는다 (4) 표현(representation)과 자원 분리 — 같은 리소스를 JSON·XML로 반환 가능 (5) HATEOAS(현실적으론 잘 안 지켜짐).',
  },
  {
    content: 'JWT의 구조와 유의점은?',
    answer:
      'header.payload.signature 세 부분을 base64url로 인코딩. payload는 암호화가 아닌 서명만 되어 있어 누구나 디코드해 읽을 수 있다 — 민감정보 X. 서버가 세션을 저장 안 해도 검증 가능해 확장에 유리하지만, 발급 후 강제 만료가 어려워 refresh token + 짧은 access token 조합이 정석.',
  },
  {
    content: '세션 vs JWT, 인증에서 뭘 쓸지 어떻게 정하나?',
    answer:
      '세션은 서버가 상태를 저장해 revoke가 즉시 가능하지만 서버가 무거워진다(sticky session·중앙 세션 스토어 필요). JWT는 stateless라 서버 확장에 유리하지만 즉시 로그아웃/권한 회수가 어렵다. 로그아웃·권한 관리가 중요하면 세션(또는 짧은 JWT + 서버 blacklist), 마이크로서비스간 인증엔 JWT가 흔함.',
  },
  {
    content: '캐시를 도입할 때 고려할 것들은?',
    answer:
      '(1) 캐시 무효화 전략(TTL vs write-through vs write-behind vs cache-aside) (2) 캐시 히트/미스 비율 측정 (3) 캐시 스탬피드(만료 순간 대량 요청) 방지 — jitter, single-flight (4) 캐시 일관성(원본과의 stale 허용 범위) (5) 캐시 계층(브라우저 → CDN → 앱 캐시 → DB 버퍼).',
  },
  {
    content: 'Idempotent(멱등) 메서드란? HTTP에서 어떤 게 해당하나?',
    answer:
      '같은 요청을 여러 번 보내도 결과가 동일한 성질. GET, PUT, DELETE, HEAD, OPTIONS는 멱등, POST와 PATCH는 아님(스펙상). 재시도·중복 클릭 방지 로직 설계에 중요.',
  },
  {
    content: 'Rate limiting을 구현하는 대표 알고리즘 두 가지?',
    answer:
      'Token bucket(일정 속도로 토큰 채우고, 요청은 토큰 소비 — burst 허용)과 Sliding window(고정 시간창 안 요청 수 카운트 — 정확한 초당 제한). Fixed window는 창 경계에서 두 배 트래픽이 들어올 수 있어 sliding으로 개선. 분산 환경은 Redis 등 중앙 카운터가 흔하다.',
  },
  {
    content: '비동기 처리에서 메시지 큐를 쓰는 이유는?',
    answer:
      '요청/처리를 시간·공간으로 분리해 (1) 급증하는 부하를 완충(buffering) (2) 서비스 간 결합도를 낮춤 (3) 실패 재시도·DLQ로 안정성 확보. 사용자 응답과 무거운 작업(이메일 발송, 이미지 처리 등)을 분리할 때 자주 쓴다. Kafka/RabbitMQ/SQS 등.',
  },
  {
    content: '`var`, `let`, `const`의 차이는?',
    answer:
      '`var`는 함수 스코프이고 호이스팅 시 undefined로 초기화되어 선언 전 접근이 가능. `let`/`const`는 블록 스코프이고 TDZ(선언 전 접근 시 ReferenceError)가 있다. `const`는 재할당만 금지 — 객체 내부는 변경 가능.',
  },
  {
    content: 'React의 렌더 트리거는 무엇들인가?',
    answer:
      '(1) state 변경(useState/useReducer) (2) props 변경 (3) 부모 컴포넌트 재렌더 (4) context 값 변경 (5) key 변경. React 19부터 컴파일러가 자동 메모이제이션을 넣으면서 수동 useMemo/useCallback 필요성이 크게 줄었다.',
  },
  {
    content: 'Virtual DOM은 왜 필요한가? 실제 DOM보다 빠르다는 게 맞나?',
    answer:
      '실제 DOM 조작 자체가 느린 게 아니라, 여러 조작을 배치로 최소 diff만 반영하기 위한 추상화다. React는 렌더 결과를 VDOM 트리로 만들고 이전 트리와 비교해 실제 DOM에 변경분만 적용한다. 늘 빠르진 않고 오히려 오버헤드일 수 있어, 리액트가 아닌 signal 기반(Svelte, Solid) 접근도 유효.',
  },
  {
    content: 'useEffect의 실행 시점과 의존성 배열이 하는 일은?',
    answer:
      '컴포넌트가 렌더되어 DOM에 반영된 후 실행된다(paint 이후). 의존성 배열의 값이 이전과 얕은 비교로 다를 때만 재실행되며, 빈 배열은 mount 시 한 번만, 배열 생략은 매 렌더마다 실행된다. cleanup 함수는 다음 실행 직전과 unmount 시 호출.',
  },
  {
    content: '브라우저의 렌더링 과정(Critical Rendering Path)은?',
    answer:
      'HTML 파싱 → DOM 트리 / CSS 파싱 → CSSOM 트리 → 결합해 Render 트리 → Layout(reflow, 크기·위치 계산) → Paint(픽셀 채우기) → Composite(레이어 합성). script 태그는 파싱을 블로킹할 수 있어 async/defer로 완화한다.',
  },
  {
    content: '이벤트 버블링과 캡처링, 그리고 위임(delegation)은?',
    answer:
      '이벤트는 캡처 단계(root→target) → 타겟 → 버블 단계(target→root)로 전파된다. `addEventListener`의 3번째 인자 `capture: true`로 캡처에 등록. 위임은 자식 각각에 리스너를 붙이지 않고 부모에 한 번만 등록해 `event.target`으로 실제 발생 요소를 판별하는 패턴(리스트/테이블 등에서 성능·메모리 이득).',
  },
] as const;
