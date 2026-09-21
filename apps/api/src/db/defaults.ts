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

export interface DefaultMuscleGoal {
  muscleKey: string;
  weeklySetTarget: number;
}

// 부위별 주간 세트 목표 초기값. MUSCLE_OPTIONS 순서 (등/가슴/어깨/팔/다리).
// 초심자 MEV 근사 (Schoenfeld 등 볼륨 문헌 참고). 사용자가 /settings/muscle-goals
// 에서 자유롭게 조정 가능.
export const DEFAULT_MUSCLE_GOALS: readonly DefaultMuscleGoal[] = [
  { muscleKey: 'back', weeklySetTarget: 10 },
  { muscleKey: 'chest', weeklySetTarget: 10 },
  { muscleKey: 'shoulder', weeklySetTarget: 10 },
  { muscleKey: 'arm', weeklySetTarget: 8 },
  { muscleKey: 'leg', weeklySetTarget: 12 },
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
  // 우아한형제들(techblog.woowahan.com) 제거 — Cloudflare Bot Fight Mode로
  // Render IP에서 지속 403. UA/헤더 스푸핑 무의미. Cloudflare Workers 프록시
  // 세팅은 1인 앱에 오버킬이라 손절. 직접 방문(https://techblog.woowahan.com).
  { name: '토스', rssUrl: 'https://toss.tech/rss.xml', siteUrl: 'https://toss.tech' },
  { name: '라인', rssUrl: 'https://engineering.linecorp.com/ko/feed/', siteUrl: 'https://engineering.linecorp.com/ko' },
  { name: '당근', rssUrl: 'https://medium.com/feed/daangn', siteUrl: 'https://medium.com/daangn' },
  { name: '쿠팡', rssUrl: 'https://medium.com/feed/coupang-engineering', siteUrl: 'https://medium.com/coupang-engineering' },
  { name: '카카오페이', rssUrl: 'https://tech.kakaopay.com/rss', siteUrl: 'https://tech.kakaopay.com' },
  { name: '네이버 D2', rssUrl: 'https://d2.naver.com/d2.atom', siteUrl: 'https://d2.naver.com' },
] as const;

export interface DefaultQuestionCategory {
  key: string;
  label: string;
  sortOrder: number;
  isDefault: boolean;
}

// 학습 질문 카테고리 초기값 (Phase 13.2a). 사용자가 /settings/question-categories
// 에서 자유롭게 편집 가능. companies.type2 ↔ company_types 관계와 동일하게
// questions.category_key가 여기 key를 참조 (FK 없음 — 카테고리 삭제 시
// 질문 데이터는 유지되고 chip 목록에서만 사라짐).
export const DEFAULT_QUESTION_CATEGORIES: readonly DefaultQuestionCategory[] = [
  { key: 'cs_basic', label: 'CS 기초', sortOrder: 0, isDefault: true },
  { key: 'network', label: '네트워크', sortOrder: 1, isDefault: true },
  { key: 'database', label: '데이터베이스', sortOrder: 2, isDefault: true },
  { key: 'backend', label: '백엔드', sortOrder: 3, isDefault: true },
  { key: 'frontend', label: '프론트엔드', sortOrder: 4, isDefault: true },
] as const;

export interface DefaultQuestion {
  content: string;
  answer: string;
  /** DEFAULT_QUESTION_CATEGORIES.key 중 하나. seed 실행 시 questions.category_key로 sync. */
  categoryKey: string;
  /** 답을 열어본 뒤 이어질 만한 꼬리 질문 1~2개. 줄바꿈으로 구분. */
  tip?: string;
}

// CS interview 기초. 분포: CS기초 20 · 네트워크 12 · DB 10 · 백엔드 32 · 프론트 26.
export const DEFAULT_QUESTIONS: readonly DefaultQuestion[] = [
  {
    content: 'Stack과 Queue의 차이는?',
    categoryKey: 'cs_basic',
    answer:
      'Stack은 LIFO(Last In First Out) — 마지막에 넣은 걸 먼저 뺀다. Queue는 FIFO(First In First Out) — 먼저 넣은 걸 먼저 뺀다. Stack은 함수 호출 스택·되돌리기 등에, Queue는 작업 대기열·BFS 탐색 등에 쓰인다.',
    tip:
      '실제 프로젝트에서 Stack이나 Queue를 직접 써본 경험이 있나요?\n덱(Deque)은 어떤 상황에서 유용한가요?',
  },
  {
    content: '해시테이블의 시간복잡도와 충돌 처리 방식은?',
    categoryKey: 'cs_basic',
    answer:
      '평균 O(1) 조회/삽입/삭제, 최악 O(n)(모든 키가 같은 버킷). 충돌 처리는 크게 체이닝(같은 버킷을 연결리스트로)과 오픈 어드레싱(다음 빈 슬롯 탐색)이 있다. 부하 계수(load factor)가 임계를 넘으면 재해싱으로 버킷을 늘린다.',
    tip:
      '체이닝과 오픈 어드레싱 중 언제 뭘 고르나요?\nJava HashMap이나 Python dict는 실제로 어떻게 구현되어 있나요?',
  },
  {
    content: 'Big-O 표기법이 뜻하는 것은?',
    categoryKey: 'cs_basic',
    answer:
      '입력 크기 n이 커질 때 알고리즘 실행 시간(또는 공간)의 상한을 나타내는 점근 표기. 상수·저차항을 무시하고 성장률만 본다. 예: 이중 반복문은 O(n²), 이진 탐색은 O(log n).',
    tip:
      'Best/Average/Worst 케이스를 예를 들어 설명해줄 수 있나요?\nBig-Theta, Big-Omega와는 어떻게 다른가요?',
  },
  {
    content: '배열 vs 연결리스트, 언제 뭘 쓰나?',
    categoryKey: 'cs_basic',
    answer:
      '배열은 인덱스 접근 O(1)이라 랜덤 접근이 잦으면 유리, 중간 삽입/삭제는 O(n). 연결리스트는 반대로 순차 접근 O(n)이지만 노드 참조를 알면 삽입/삭제가 O(1). 캐시 지역성은 배열이 훨씬 좋아 실전에서는 배열이 자주 이긴다.',
    tip:
      '캐시 지역성이 성능에 얼마나 영향을 준다고 생각하나요?\n중간 삽입이 잦은 상황에서 어떤 선택을 하겠어요?',
  },
  {
    content: '이진 탐색이 성립하는 조건과 시간복잡도는?',
    categoryKey: 'cs_basic',
    answer:
      '배열이 정렬되어 있어야 하고, 랜덤 접근이 가능해야 한다. 매 단계마다 탐색 범위를 반씩 줄여 O(log n)이다. 값이 없어도 lower_bound로 삽입 위치를 O(log n)에 찾을 수 있다.',
    tip:
      '정렬되어 있지 않은 데이터에서의 대안은?\nlower_bound와 upper_bound의 차이를 설명해줄 수 있나요?',
  },
  {
    content: '프로세스와 스레드의 차이는?',
    categoryKey: 'cs_basic',
    answer:
      '프로세스는 독립된 메모리 공간을 갖는 실행 단위, 스레드는 프로세스 안에서 메모리(힙·코드)를 공유하는 실행 흐름이다. 컨텍스트 스위칭 비용은 스레드가 훨씬 싸지만, 스레드끼리는 동기화 문제(race condition, deadlock)를 신경써야 한다.',
    tip:
      'IPC(프로세스 간 통신)에는 어떤 방식이 있나요?\n스레드 대신 코루틴/async를 쓰는 이유는?',
  },
  {
    content: 'Race condition과 이를 막는 방법은?',
    categoryKey: 'cs_basic',
    answer:
      '여러 스레드/프로세스가 공유 자원에 동시에 접근·수정할 때 실행 순서에 따라 결과가 달라지는 현상. Mutex/Lock으로 임계 영역을 직렬화하거나, atomic 연산·CAS(Compare-And-Swap), 락 프리 자료구조로 방어한다. DB에선 트랜잭션·격리 수준·낙관/비관 락으로 다룬다.',
    tip:
      '낙관적 락과 비관적 락은 각각 언제 유리한가요?\n분산 환경에서 race condition은 어떻게 다루나요?',
  },
  {
    content: '스택 오버플로우가 나는 대표적인 원인은?',
    categoryKey: 'cs_basic',
    answer:
      '재귀 호출이 종료 조건 없이 반복될 때 콜 스택이 한계까지 쌓여 발생. 매우 깊은 호출(파일 트리 순회 등)에서도 날 수 있어, 재귀를 반복문으로 바꾸거나 tail-call/명시적 스택으로 우회한다. 언어에 따라 스택 크기 조정도 가능하지만 근본 해결은 아니다.',
    tip:
      '힙 오버플로우와는 어떻게 다른가요?\nTail Call Optimization은 어떤 조건에서 동작하나요?',
  },
  {
    content: 'TCP와 UDP의 차이는?',
    categoryKey: 'network',
    answer:
      'TCP는 연결 지향(3-way handshake)이고 순서·재전송·흐름 제어를 보장한다. UDP는 비연결·비신뢰, 헤더가 작고 지연이 낮다. 파일 전송·웹은 TCP, 실시간 게임·음성/영상 스트리밍은 UDP(또는 QUIC).',
    tip:
      'QUIC은 왜 등장했고 어떤 문제를 푸나요?\nHTTP/3는 어떤 트랜스포트를 쓰나요?',
  },
  {
    content: 'HTTP status 200/301/400/401/403/404/500 각각 언제 쓰나?',
    categoryKey: 'network',
    answer:
      '200 성공, 301 영구 리다이렉트(캐시됨), 400 잘못된 요청(형식 오류), 401 인증 안 됨(로그인 필요), 403 인증됐지만 권한 없음, 404 리소스 없음, 500 서버 내부 오류. 401 vs 403 구분이 중요: 로그인 여부가 401, 권한 여부가 403.',
    tip:
      '200과 201, 204는 어떻게 다른가요?\n429는 언제 반환하고 어떻게 활용하나요?',
  },
  {
    content: 'HTTPS는 어떻게 통신을 보호하는가?',
    categoryKey: 'network',
    answer:
      'TLS 핸드셰이크로 서버 인증서를 검증하고 대칭키를 교환한다. 이후 데이터는 대칭키로 암호화되어 도청·변조·위장을 막는다. 서명·인증서 체인으로 신뢰(Chain of trust)를 형성하며, 최신은 TLS 1.3(1-RTT 또는 0-RTT)이 표준.',
    tip:
      'TLS 1.2와 1.3의 주요 차이는?\n인증서 검증이 실패하면 어떤 시나리오를 생각해볼 수 있나요?',
  },
  {
    content: 'DNS는 무엇이고 조회 순서는?',
    categoryKey: 'network',
    answer:
      '도메인 이름을 IP 주소로 변환하는 분산 시스템. 브라우저 캐시 → OS 캐시 → resolver(ISP) → root → TLD(.com) → authoritative 순으로 위임된다. 결과는 TTL 동안 캐싱된다.',
    tip:
      'TTL이 너무 길면·짧으면 각각 어떤 문제가 있나요?\nDNS 라운드로빈은 부하 분산에 어떻게 쓰이나요?',
  },
  {
    content: 'CORS는 왜 필요하고 어떻게 동작하나?',
    categoryKey: 'network',
    answer:
      '브라우저의 same-origin 정책으로 다른 origin의 응답을 JS가 읽지 못하게 막는 게 기본. CORS는 서버가 `Access-Control-Allow-Origin` 등 헤더로 명시적으로 허용해 우회한다. non-simple 요청은 브라우저가 먼저 OPTIONS(preflight)로 허용 여부를 확인한다.',
    tip:
      'preflight이 트리거되는 조건은 뭔가요?\ncredentials(쿠키)를 포함한 요청은 어떻게 다뤄야 하나요?',
  },
  {
    content: '트랜잭션의 ACID 각 속성은?',
    categoryKey: 'database',
    answer:
      'Atomicity(원자성) 전부 성공 or 전부 롤백, Consistency(일관성) 제약 조건 항상 유지, Isolation(격리성) 동시 트랜잭션이 서로 간섭 안 함, Durability(지속성) 커밋 후엔 장애가 나도 반영 유지. 격리 수준(RC/RR/Serializable)이 실전에서 tradeoff의 핵심.',
    tip:
      '격리 수준별로 발생 가능한 이상 현상(dirty read, phantom 등)은?\nNoSQL의 BASE와는 어떻게 다른가요?',
  },
  {
    content: '인덱스는 왜 조회는 빨라지고 쓰기는 느려지나?',
    categoryKey: 'database',
    answer:
      '인덱스는 정렬된 별도 자료구조(B-tree 등)를 유지하기 때문에 특정 컬럼 검색을 O(log n)에 처리한다. 대신 INSERT/UPDATE/DELETE 시 인덱스도 갱신해야 해 쓰기 비용이 늘고 디스크 공간을 추가로 쓴다. 자주 조회하는 컬럼, 카디널리티 높은 컬럼에 우선 걸어야 이득.',
    tip:
      '복합 인덱스에서 컬럼 순서가 왜 중요한가요?\n커버링 인덱스가 뭔가요?',
  },
  {
    content: 'RDB의 정규화란? 언제 역정규화를 고려하나?',
    categoryKey: 'database',
    answer:
      '중복 데이터를 없애고 이상현상(update/insert/delete anomaly)을 막기 위해 테이블을 쪼개는 과정(1NF ~ BCNF). 조인이 많아져 읽기 성능이 병목이 되면 역정규화로 데이터를 복제·중복 컬럼을 두어 조인을 줄인다. OLAP·리포트성 워크로드에서 흔함.',
    tip:
      '왜 보통 3NF까지만 하고 멈추나요?\n스타 스키마·스노우플레이크는 왜 역정규화를 쓰나요?',
  },
  {
    content: 'N+1 문제란 무엇이고 어떻게 해결하는가?',
    categoryKey: 'database',
    answer:
      '리스트를 가져온 뒤 각 항목의 연관 엔티티를 개별 쿼리로 조회해 총 1+N번 쿼리가 발생하는 문제. ORM의 지연 로딩이 원인일 때가 많다. JOIN, IN절 batch fetch, DataLoader(GraphQL) 등으로 한 번에 묶어 해결한다.',
    tip:
      'eager loading에는 단점이 없나요?\nDataLoader는 어떤 원리로 동작하나요?',
  },
  {
    content: 'REST의 핵심 원칙 몇 가지만 말해달라.',
    categoryKey: 'backend',
    answer:
      '(1) 자원 중심 URI 설계 — 동사 대신 명사 (2) HTTP 메서드로 동작 표현 — GET/POST/PUT/PATCH/DELETE (3) 무상태(stateless) — 요청마다 필요한 정보를 모두 담는다 (4) 표현(representation)과 자원 분리 — 같은 리소스를 JSON·XML로 반환 가능 (5) HATEOAS(현실적으론 잘 안 지켜짐).',
    tip:
      'gRPC나 GraphQL과 비교했을 때 REST의 장단점은?\nHATEOAS가 왜 현실에서 잘 안 지켜진다고 생각하나요?',
  },
  {
    content: 'JWT의 구조와 유의점은?',
    categoryKey: 'backend',
    answer:
      'header.payload.signature 세 부분을 base64url로 인코딩. payload는 암호화가 아닌 서명만 되어 있어 누구나 디코드해 읽을 수 있다 — 민감정보 X. 서버가 세션을 저장 안 해도 검증 가능해 확장에 유리하지만, 발급 후 강제 만료가 어려워 refresh token + 짧은 access token 조합이 정석.',
    tip:
      'refresh token은 어디에 저장해야 안전할까요?\n이미 발급한 JWT를 어떻게 무효화(revoke)할 수 있나요?',
  },
  {
    content: '세션 vs JWT, 인증에서 뭘 쓸지 어떻게 정하나?',
    categoryKey: 'backend',
    answer:
      '세션은 서버가 상태를 저장해 revoke가 즉시 가능하지만 서버가 무거워진다(sticky session·중앙 세션 스토어 필요). JWT는 stateless라 서버 확장에 유리하지만 즉시 로그아웃/권한 회수가 어렵다. 로그아웃·권한 관리가 중요하면 세션(또는 짧은 JWT + 서버 blacklist), 마이크로서비스간 인증엔 JWT가 흔함.',
    tip:
      'OAuth 2.0에서 세션과 JWT는 어떻게 조합되나요?\n마이크로서비스 간 인증에는 왜 JWT가 흔히 쓰이나요?',
  },
  {
    content: '캐시를 도입할 때 고려할 것들은?',
    categoryKey: 'backend',
    answer:
      '(1) 캐시 무효화 전략(TTL vs write-through vs write-behind vs cache-aside) (2) 캐시 히트/미스 비율 측정 (3) 캐시 스탬피드(만료 순간 대량 요청) 방지 — jitter, single-flight (4) 캐시 일관성(원본과의 stale 허용 범위) (5) 캐시 계층(브라우저 → CDN → 앱 캐시 → DB 버퍼).',
    tip:
      '캐시 무효화가 왜 어려운 문제로 꼽히나요?\n캐시 스탬피드는 실전에서 어떻게 방어하나요?',
  },
  {
    content: 'Idempotent(멱등) 메서드란? HTTP에서 어떤 게 해당하나?',
    categoryKey: 'backend',
    answer:
      '같은 요청을 여러 번 보내도 결과가 동일한 성질. GET, PUT, DELETE, HEAD, OPTIONS는 멱등, POST와 PATCH는 아님(스펙상). 재시도·중복 클릭 방지 로직 설계에 중요.',
    tip:
      'POST가 스펙상 멱등이 아닌 이유는?\n결제 API에서 멱등성을 어떻게 보장하나요?',
  },
  {
    content: 'Rate limiting을 구현하는 대표 알고리즘 두 가지?',
    categoryKey: 'backend',
    answer:
      'Token bucket(일정 속도로 토큰 채우고, 요청은 토큰 소비 — burst 허용)과 Sliding window(고정 시간창 안 요청 수 카운트 — 정확한 초당 제한). Fixed window는 창 경계에서 두 배 트래픽이 들어올 수 있어 sliding으로 개선. 분산 환경은 Redis 등 중앙 카운터가 흔하다.',
    tip:
      '분산 환경에서 카운터는 어떻게 동기화하나요?\n스로틀링과 큐잉은 어떤 차이가 있나요?',
  },
  {
    content: '비동기 처리에서 메시지 큐를 쓰는 이유는?',
    categoryKey: 'backend',
    answer:
      '요청/처리를 시간·공간으로 분리해 (1) 급증하는 부하를 완충(buffering) (2) 서비스 간 결합도를 낮춤 (3) 실패 재시도·DLQ로 안정성 확보. 사용자 응답과 무거운 작업(이메일 발송, 이미지 처리 등)을 분리할 때 자주 쓴다. Kafka/RabbitMQ/SQS 등.',
    tip:
      'at-least-once와 exactly-once 전달은 어떻게 다른가요?\nDead Letter Queue(DLQ)는 언제 어떻게 활용하나요?',
  },
  {
    content: '`var`, `let`, `const`의 차이는?',
    categoryKey: 'frontend',
    answer:
      '`var`는 함수 스코프이고 호이스팅 시 undefined로 초기화되어 선언 전 접근이 가능. `let`/`const`는 블록 스코프이고 TDZ(선언 전 접근 시 ReferenceError)가 있다. `const`는 재할당만 금지 — 객체 내부는 변경 가능.',
    tip:
      'var 호이스팅이 낳는 버그 사례가 있나요?\nTDZ가 존재해서 좋은 점은 뭘까요?',
  },
  {
    content: 'React의 렌더 트리거는 무엇들인가?',
    categoryKey: 'frontend',
    answer:
      '(1) state 변경(useState/useReducer) (2) props 변경 (3) 부모 컴포넌트 재렌더 (4) context 값 변경 (5) key 변경. React 19부터 컴파일러가 자동 메모이제이션을 넣으면서 수동 useMemo/useCallback 필요성이 크게 줄었다.',
    tip:
      'React 19 컴파일러는 useMemo/useCallback을 어떻게 대체하나요?\n재렌더가 성능 병목일 때 어떻게 진단하나요?',
  },
  {
    content: 'Virtual DOM은 왜 필요한가? 실제 DOM보다 빠르다는 게 맞나?',
    categoryKey: 'frontend',
    answer:
      '실제 DOM 조작 자체가 느린 게 아니라, 여러 조작을 배치로 최소 diff만 반영하기 위한 추상화다. React는 렌더 결과를 VDOM 트리로 만들고 이전 트리와 비교해 실제 DOM에 변경분만 적용한다. 늘 빠르진 않고 오히려 오버헤드일 수 있어, 리액트가 아닌 signal 기반(Svelte, Solid) 접근도 유효.',
    tip:
      'signal 기반(Solid, Svelte)과 VDOM의 근본 차이는?\nReact Fiber 아키텍처는 무엇을 개선했나요?',
  },
  {
    content: 'useEffect의 실행 시점과 의존성 배열이 하는 일은?',
    categoryKey: 'frontend',
    answer:
      '컴포넌트가 렌더되어 DOM에 반영된 후 실행된다(paint 이후). 의존성 배열의 값이 이전과 얕은 비교로 다를 때만 재실행되며, 빈 배열은 mount 시 한 번만, 배열 생략은 매 렌더마다 실행된다. cleanup 함수는 다음 실행 직전과 unmount 시 호출.',
    tip:
      'cleanup을 빠트리면 어떤 종류의 버그가 발생하나요?\nuseEffect와 useLayoutEffect는 언제 각각 써야 하나요?',
  },
  {
    content: '브라우저의 렌더링 과정(Critical Rendering Path)은?',
    categoryKey: 'frontend',
    answer:
      'HTML 파싱 → DOM 트리 / CSS 파싱 → CSSOM 트리 → 결합해 Render 트리 → Layout(reflow, 크기·위치 계산) → Paint(픽셀 채우기) → Composite(레이어 합성). script 태그는 파싱을 블로킹할 수 있어 async/defer로 완화한다.',
    tip:
      'LCP나 FCP를 개선하려면 어디부터 손대나요?\nscript 태그의 async와 defer는 어떻게 다른가요?',
  },
  {
    content: '이벤트 버블링과 캡처링, 그리고 위임(delegation)은?',
    categoryKey: 'frontend',
    answer:
      '이벤트는 캡처 단계(root→target) → 타겟 → 버블 단계(target→root)로 전파된다. `addEventListener`의 3번째 인자 `capture: true`로 캡처에 등록. 위임은 자식 각각에 리스너를 붙이지 않고 부모에 한 번만 등록해 `event.target`으로 실제 발생 요소를 판별하는 패턴(리스트/테이블 등에서 성능·메모리 이득).',
    tip:
      'stopPropagation과 preventDefault의 차이는 뭔가요?\nReact의 SyntheticEvent는 실제 DOM 이벤트와 어떻게 다른가요?',
  },
  {
    content: 'GC(Garbage Collection)는 어떤 원리로 동작하나?',
    categoryKey: 'cs_basic',
    answer:
      '더 이상 참조되지 않는 객체를 자동 회수. Reference counting(카운트 0에서 즉시 해제, 순환 참조에 취약)과 Tracing(Root에서 도달 가능한 객체만 남기고 나머지 제거 — Mark-Sweep/Copying/Generational)이 대표적. JVM·V8은 세대별 GC로 짧게 사는 객체를 빠르게 회수한다.',
    tip:
      '세대별 GC에서 Young/Old 영역을 왜 나누나요?\nSTW를 줄이는 최근 접근(ZGC, Shenandoah)은 어떻게 동작하나요?',
  },
  {
    content: '프로세스 컨텍스트 스위칭 시 저장되는 정보는?',
    categoryKey: 'cs_basic',
    answer:
      'PC(프로그램 카운터), 레지스터, 스택 포인터, 페이지 테이블, 열린 파일 디스크립터, 우선순위 등 PCB(Process Control Block)에 담긴 상태를 저장·복원. 스레드 스위칭은 레지스터/스택 정도라 훨씬 가볍다. TLB flush까지 겹치면 캐시 히트율이 급락해 성능이 크게 영향받는다.',
    tip:
      '스레드 스위칭이 왜 프로세스보다 훨씬 저렴한가요?\n너무 잦은 스위칭을 어떻게 감지·완화하나요?',
  },
  {
    content: '페이지 폴트와 세그멘테이션 폴트의 차이는?',
    categoryKey: 'cs_basic',
    answer:
      '페이지 폴트는 가상 메모리 페이지가 물리 메모리에 없어 디스크에서 로드가 필요한 상황 — 정상 흐름의 일부(minor)와 디스크 접근이 필요한 major로 나뉜다. seg fault는 프로세스가 접근 권한 없는 주소를 건드릴 때 커널이 SIGSEGV로 종료 — 버그다.',
    tip:
      'thrashing은 왜 발생하고 어떻게 감지하나요?\nseg fault를 디버깅할 때 어떤 도구를 쓰나요?',
  },
  {
    content: '뮤텍스와 세마포어의 차이는?',
    categoryKey: 'cs_basic',
    answer:
      '뮤텍스는 이진(0/1) 상태와 소유권 개념을 갖는다 — 잠근 스레드만 풀 수 있다. 세마포어는 카운터(0..N)로 최대 N개 동시 접근을 허용하며 소유권이 없어 다른 스레드가 signal 할 수 있다. 임계 영역 보호엔 뮤텍스, 자원 풀 관리엔 세마포어가 자연스럽다.',
    tip:
      'binary semaphore는 뮤텍스와 어떻게 다른가요?\n우선순위 역전(priority inversion) 문제는 어떻게 해결하나요?',
  },
  {
    content: 'Deadlock이 발생하는 네 가지 조건은?',
    categoryKey: 'cs_basic',
    answer:
      '상호 배제(자원을 한 번에 하나만 점유), 점유와 대기(자원 하나 잡은 채 다른 것 대기), 비선점(강제로 뺏을 수 없음), 순환 대기(대기 그래프에 사이클). 네 조건이 동시에 성립해야 데드락 — 하나라도 깨면 예방된다.',
    tip:
      '데드락을 예방(prevention)과 회피(avoidance)로 나누면 각각 어떤 접근인가요?\nBanker\'s algorithm이 실전에서 잘 안 쓰이는 이유는?',
  },
  {
    content: '컴파일러와 인터프리터의 차이는?',
    categoryKey: 'cs_basic',
    answer:
      '컴파일러는 소스 전체를 한 번에 기계어(또는 IR)로 번역해 실행 파일을 만든다 — 실행은 빠르나 컴파일 대기. 인터프리터는 한 줄씩 해석·실행 — 실행이 느리지만 REPL·핫 리로드가 자연스럽다. JIT은 인터프리터+컴파일러 하이브리드로 hot spot을 런타임에 기계어로 변환.',
    tip:
      'V8·JVM의 JIT는 hot spot을 어떻게 찾나요?\nAOT(Ahead-of-time) 컴파일이 최근 다시 주목받는 이유는?',
  },
  {
    content: '캐시 메모리 계층(L1/L2/L3)과 지역성이 성능에 미치는 영향은?',
    categoryKey: 'cs_basic',
    answer:
      'CPU에 가까운 순으로 L1(수 KB, 코어당) → L2(수백 KB, 코어당) → L3(수 MB, 공유). 아래로 갈수록 느리지만 커진다. 시간 지역성(같은 데이터 재사용)과 공간 지역성(인접 데이터 접근)이 좋으면 캐시 히트율이 올라 성능이 크게 차이난다. 배열이 실전에서 연결리스트를 이기는 핵심 이유.',
    tip:
      '캐시 미스가 실제 성능에 얼마나 영향을 준다고 생각하나요?\n캐시 라인 크기를 알면 어떤 최적화가 가능한가요?',
  },
  {
    content: 'CPU 스케줄링 알고리즘(FCFS, SJF, RR, MLFQ)은 각각 어떻게 다른가?',
    categoryKey: 'cs_basic',
    answer:
      'FCFS(먼저 온 순, 긴 작업이 짧은 작업을 막음 — convoy effect). SJF(짧은 작업 우선, 평균 응답 최적이나 starvation). RR(타임 슬라이스 순환, 응답성 좋으나 컨텍스트 스위칭↑). MLFQ(다단계 큐로 새 프로세스는 상위 큐, 오래 걸리면 하위로 강등 — 실제 OS 기본).',
    tip:
      'preemptive와 non-preemptive 스케줄링의 트레이드오프는?\n실시간 스케줄링(RTOS)에서는 뭐가 달라지나요?',
  },
  {
    content: '가상 메모리와 페이지 테이블은 어떻게 동작하나?',
    categoryKey: 'cs_basic',
    answer:
      '프로세스는 자기만의 가상 주소 공간을 갖고, MMU가 페이지 테이블을 참조해 물리 주소로 변환. 페이지 단위(보통 4KB)로 관리하고, 자주 쓰는 매핑은 TLB에 캐시. 프로세스 격리·페이지 스왑·copy-on-write 같은 최적화가 가능해진다.',
    tip:
      'TLB miss가 발생하면 무슨 일이 벌어지나요?\ncopy-on-write는 어떤 상황에서 특히 효과적인가요?',
  },
  {
    content: '시스템 콜과 user/kernel 모드는?',
    categoryKey: 'cs_basic',
    answer:
      'CPU는 특권 명령을 실행할 수 있는 kernel mode와 제한된 user mode를 구분. 파일 I/O·네트워크·프로세스 생성 등은 커널만 가능하므로 user는 시스템 콜로 요청 → 트랩으로 mode 전환 → 커널 처리 → 복귀. mode 전환 자체가 비용이라 read/write 배칭·mmap 등이 성능에 유효.',
    tip:
      'context switch와 mode switch는 어떻게 다른가요?\nio_uring이 기존 syscall 모델을 어떻게 개선하나요?',
  },
  {
    content: 'IPC(Inter-Process Communication)의 대표 종류는?',
    categoryKey: 'cs_basic',
    answer:
      '파이프/네임드 파이프(부모-자식 or 같은 호스트), 공유 메모리(가장 빠르지만 동기화 필요), 메시지 큐(OS가 큐잉), 소켓(같은/다른 호스트, 네트워크와 통일), 시그널(간단한 이벤트). 성능·범용성·복잡도 트레이드오프가 다르다.',
    tip:
      'Unix domain socket이 TCP loopback보다 왜 빠른가요?\n공유 메모리 사용 시 동기화는 뭘로 하나요?',
  },
  {
    content: 'Quick sort · Merge sort · Heap sort의 트레이드오프는?',
    categoryKey: 'cs_basic',
    answer:
      'Quick은 평균 O(n log n)에 상수가 작고 in-place — 실전 기본. 최악 O(n²)는 pivot 선택으로 완화. Merge는 최악도 O(n log n) 안정 정렬이지만 O(n) 추가 공간. Heap은 최악 O(n log n), in-place, unstable — 우선순위 큐 기반.',
    tip:
      'stable sort가 왜 실무에서 중요한가요?\n실전 라이브러리(V8·Java 등) 정렬은 뭘 쓰나요?',
  },
  {
    content: 'TCP 3-way handshake 과정은?',
    categoryKey: 'network',
    answer:
      'Client가 SYN(초기 순번 X) → Server가 SYN+ACK(자기 순번 Y, ACK=X+1) → Client가 ACK(Y+1)로 연결 확립. 각 단의 순번과 확인번호로 이후 재전송·순서 정렬의 기준을 잡는다. 종료는 FIN/ACK/FIN/ACK 4-way.',
    tip:
      'TIME_WAIT 상태가 필요한 이유는 뭘까요?\nSYN flood 공격은 어떻게 방어하나요?',
  },
  {
    content: 'HTTP/1.1 · HTTP/2 · HTTP/3의 주요 차이는?',
    categoryKey: 'network',
    answer:
      '1.1은 텍스트 기반·요청당 하나(keep-alive로 재사용). 2는 바이너리·멀티플렉싱(하나의 TCP에서 다중 스트림)·헤더 압축(HPACK). 3는 TCP 대신 QUIC(UDP 위 TLS 내장)로 head-of-line blocking을 근본 해결하고 연결 설정을 0/1-RTT로 단축.',
    tip:
      'HTTP/2의 stream multiplexing이 있는데도 HOL blocking이 남는 이유는?\nQUIC의 연결 마이그레이션(IP 변경에도 세션 유지)은 왜 유용한가요?',
  },
  {
    content: 'GET과 POST의 차이는 (RFC 관점에서)?',
    categoryKey: 'network',
    answer:
      'GET은 안전(서버 상태 변경 X)하고 멱등하며 캐시·북마크·리트라이가 자연스럽다. 관례상 body 안 씀. POST는 서버 상태를 변경할 수 있고 스펙상 멱등이 아니다 — 브라우저·중간 프록시가 자동 재시도하지 않는 이유.',
    tip:
      'GET에 body를 실제로 넣으면 어떤 문제가 생기나요?\nPOST 대신 PUT을 쓰는 게 나은 상황은 언제인가요?',
  },
  {
    content: 'Cookie · Session · LocalStorage 각각 언제 쓰나?',
    categoryKey: 'network',
    answer:
      '쿠키는 서버가 발급·읽고 매 요청에 자동 전송(인증 세션·CSRF 주의). 세션은 서버에 저장하고 쿠키의 세션 ID로 매칭(즉시 revoke 가능). LocalStorage는 브라우저 내 KV, JS에서만 읽고 요청에 자동 첨부 X — XSS에 노출되면 탈취되므로 토큰 저장은 신중.',
    tip:
      'SameSite=Lax/Strict/None은 각각 어떤 시나리오에 맞나요?\nAccess Token을 어디에 저장하는 게 안전할까요?',
  },
  {
    content: '로드 밸런서 L4와 L7의 차이는?',
    categoryKey: 'network',
    answer:
      'L4는 IP·포트 기반(TCP/UDP)이라 빠르고 프로토콜 무관하지만 URL·헤더 기반 라우팅 불가. L7은 HTTP 등 애플리케이션 계층을 이해해 경로/헤더로 라우팅, 재작성, 세션 쿠키 삽입 등 정교한 제어. AWS ALB(L7)·NLB(L4)가 대표.',
    tip:
      'sticky session은 L4/L7에서 각각 어떻게 구현하나요?\nSSL termination은 어디서 하는 게 좋을까요?',
  },
  {
    content: 'CDN은 성능을 어떻게 개선하나?',
    categoryKey: 'network',
    answer:
      '전 세계 엣지 노드에 정적 자원을 캐싱해 사용자와 지리적으로 가까운 곳에서 제공 — RTT 단축. 오리진 부담을 덜고, TLS 종료·gzip·이미지 최적화를 엣지에서 처리. 최근엔 엣지 컴퓨팅으로 동적 응답도 일부 처리.',
    tip:
      'cache-control과 CDN 캐시는 어떻게 연동되나요?\nstale-while-revalidate가 UX에 어떤 이점을 주나요?',
  },
  {
    content: 'WebSocket과 HTTP long polling의 차이는?',
    categoryKey: 'network',
    answer:
      'WebSocket은 HTTP로 시작한 뒤 Upgrade로 양방향 지속 연결 전환 — 지연·오버헤드 낮음. Long polling은 서버가 데이터 생길 때까지 요청을 붙잡고 있다가 응답 — 구현 단순하지만 매번 HTTP 헤더 오버헤드 + 연결 재수립. 실시간 채팅·주식 시세는 보통 WebSocket.',
    tip:
      'SSE(Server-Sent Events)는 언제 유리한가요?\nWebSocket 사용 시 인증은 어떻게 처리하나요?',
  },
  {
    content: '클러스터드 인덱스와 논-클러스터드 인덱스의 차이는?',
    categoryKey: 'database',
    answer:
      '클러스터드는 테이블 데이터를 인덱스 순으로 물리적으로 정렬해 저장 — 테이블당 하나. 논-클러스터드는 별도 자료구조에 (key, 행 위치)만 저장. 클러스터드 범위 조회는 매우 빠르지만 삽입 순서가 뒤죽박죽이면 페이지 분할 비용↑. MySQL InnoDB의 PK는 자동으로 클러스터드.',
    tip:
      'InnoDB에서 UUID를 PK로 쓰면 왜 성능이 나빠지나요?\n논-클러스터드 인덱스의 "커버링" 최적화는?',
  },
  {
    content: '낙관적 락과 비관적 락은 각각 언제 쓰나?',
    categoryKey: 'database',
    answer:
      '낙관적 락은 충돌이 드물다 가정 — version/timestamp로 커밋 시점에 검증하고 충돌 시 재시도. 비관적 락은 자원을 먼저 잠그고 작업 — 충돌 잦거나 재시도 비용이 크면 유리. 예약·재고 감소는 비관적, 문서 편집·게시글 수정은 낙관적이 자연스럽다.',
    tip:
      '재고 감소를 낙관적 락으로 하려면 재시도 정책은 어떻게 짜나요?\nSELECT ... FOR UPDATE는 어떤 락을 잡나요?',
  },
  {
    content: 'NoSQL을 언제 선택하는 게 좋을까?',
    categoryKey: 'database',
    answer:
      '스키마가 자주 변하거나(Document), 수평 확장이 필수(Key-Value/Wide-Column), 그래프 탐색이 핵심(Graph)일 때. 트랜잭션·조인·강한 일관성이 중요하면 RDB가 여전히 정답. 실전에선 RDB 기본에 특정 워크로드(캐시·검색·로그)에 NoSQL을 곁들이는 조합이 흔하다.',
    tip:
      'CAP 정리는 실제 선택에 얼마나 영향을 주나요?\nPolyglot persistence의 운영 부담은 어떤가요?',
  },
  {
    content: '데이터베이스 샤딩과 파티셔닝의 차이는?',
    categoryKey: 'database',
    answer:
      '파티셔닝은 한 DB 안에서 논리적으로 테이블을 나누는 것(수직·수평). 샤딩은 물리적으로 여러 노드로 분산 — 수평 확장이 목적. 샤딩은 조인·트랜잭션이 어려워져 애플리케이션 복잡도가 크게 는다. 필요해질 때까지 도입 미루는 게 정석.',
    tip:
      '샤드 키를 잘못 고르면 어떤 문제가 생기나요?\n리샤딩은 왜 그렇게 부담스러운 작업인가요?',
  },
  {
    content: '이중 쓰기 문제와 CDC(Change Data Capture)는?',
    categoryKey: 'database',
    answer:
      'DB와 검색엔진/캐시에 동시 쓰기는 한 쪽만 성공하는 부분 실패에 취약(이중 쓰기 문제). CDC는 DB의 WAL(변경 로그)을 읽어 변경 이벤트를 발행해 다른 시스템에 반영 — outbox 패턴과 함께 원자성·순서·재시도를 확보. Debezium이 대표.',
    tip:
      'outbox 패턴이 왜 CDC와 잘 어울리나요?\n순서 보장이 실제로 중요한 워크로드가 있나요?',
  },
  {
    content: 'Read Replica의 목적과 지연 이슈는?',
    categoryKey: 'database',
    answer:
      '읽기 부하 분산으로 primary 여유 확보, 지리적 접근성·백업/재해 복구도 겸함. 비동기 복제라 replica lag이 존재 — 방금 쓴 내용을 바로 읽으면 stale이 노출될 수 있다. 쓰기 직후엔 primary로 강제 라우팅(read-your-writes)하거나 sticky read로 완화.',
    tip:
      'replica lag은 어떻게 모니터링하나요?\nRead-your-writes를 구현하는 방법은 뭐가 있을까요?',
  },
  {
    content: 'Nginx와 Apache의 차이는?',
    categoryKey: 'backend',
    answer:
      'Apache는 프로세스/스레드 기반(요청당 하나)으로 전통적이고 모듈 생태계가 넓다. Nginx는 이벤트 기반 비동기(마스터+워커) 아키텍처로 동시 연결을 훨씬 잘 견디고 리버스 프록시·정적 파일 서빙에 강하다. 지금은 Nginx가 프록시·로드밸런서 표준에 가깝다.',
    tip:
      'C10K 문제란 무엇이고 Nginx는 어떻게 해결했나요?\nHTTP/3 지원은 두 서버 각각 어떻게 되고 있나요?',
  },
  {
    content: 'Docker와 VM(가상머신)의 차이는?',
    categoryKey: 'backend',
    answer:
      'VM은 하드웨어를 가상화해 각 OS 커널이 독립적 — 무겁고 부팅 느림. Docker는 호스트 커널을 공유하고 네임스페이스·cgroup으로 격리 — 가볍고 초 단위 시작. 대신 호스트 커널에 의존해 커널 버전/OS 호환성이 문제 될 수 있다.',
    tip:
      'rootless container가 왜 요즘 중요해졌나요?\nDocker와 containerd, Podman의 관계는?',
  },
  {
    content: 'CI/CD 파이프라인의 핵심 구성요소는?',
    categoryKey: 'backend',
    answer:
      'CI는 빌드·테스트·정적분석·아티팩트 생성으로 "합치기 안전"을 보장. CD는 스테이징 자동 배포(delivery)와 프로덕션 자동 배포(deployment). 트리거(PR/머지/스케줄), 캐시, 병렬 잡, 아티팩트 보관, 롤백 전략이 핵심이다.',
    tip:
      'trunk-based development와 CI/CD는 왜 궁합이 좋나요?\n"모든 커밋이 배포 가능"이 실전에서 어렵게 하는 요인들은?',
  },
  {
    content: 'Kubernetes의 Pod / Service / Deployment는 각각 뭔가?',
    categoryKey: 'backend',
    answer:
      'Pod는 컨테이너 실행 단위(같은 IP·볼륨 공유). Deployment는 Pod의 원하는 replica 수를 유지하고 롤링 업데이트를 관리. Service는 Pod에 안정적 이름·IP·로드밸런싱을 부여 — Pod가 바뀌어도 접근점은 유지. Ingress는 외부 HTTP 라우팅.',
    tip:
      'StatefulSet은 Deployment와 뭐가 다른가요?\nService type ClusterIP/NodePort/LoadBalancer는 각각 언제 쓰나요?',
  },
  {
    content: 'Liveness · Readiness · Startup 헬스체크는 각각 언제 쓰나?',
    categoryKey: 'backend',
    answer:
      'Liveness는 살아있나 — 실패 시 컨테이너 재시작. Readiness는 트래픽 받을 준비됐나 — 실패 시 서비스에서 제외(재시작 X). Startup은 초기화가 오래 걸리는 앱용 — 통과 전에는 liveness가 비활성. 셋을 혼동하면 무한 재시작이나 준비 안 된 인스턴스로 트래픽 유입 등 사고 난다.',
    tip:
      'DB 연결 실패는 liveness와 readiness 중 어디서 잡아야 하나요?\n헬스체크 자체가 무거우면 어떤 문제가 생길까요?',
  },
  {
    content: 'Blue/Green과 Canary 배포의 차이는?',
    categoryKey: 'backend',
    answer:
      'Blue/Green은 새 버전을 별도 환경(Green)에 전부 띄우고 로드밸런서를 한 번에 전환 — 롤백 즉시 가능하지만 자원 두 배. Canary는 새 버전에 트래픽 1%→5%→…를 점진적으로 늘리며 지표 확인 — 자원 효율이 좋고 리스크가 작지만 모니터링/자동화 필요.',
    tip:
      'Canary에서 실패를 자동으로 감지하려면 어떤 지표를 봐야 하나요?\n두 방식을 조합해서 쓰는 시나리오가 있을까요?',
  },
  {
    content: 'Circuit Breaker 패턴은 뭔가?',
    categoryKey: 'backend',
    answer:
      '호출 대상이 계속 실패하면 즉시 실패(open)해 자원을 아끼고, 일정 시간 뒤 half-open으로 소량 트래픽 시험 후 정상이면 close. 무한 재시도로 전체 시스템이 마비되는 캐스케이딩 실패를 막는다. Resilience4j, Hystrix(legacy) 등.',
    tip:
      'Circuit Breaker와 Retry를 함께 쓰면 왜 순서가 중요한가요?\nfallback 응답은 어떻게 설계해야 하나요?',
  },
  {
    content: 'Retry · Timeout · Bulkhead 회복력 패턴을 짧게 설명하면?',
    categoryKey: 'backend',
    answer:
      'Retry는 일시적 실패에 재시도(exponential backoff + jitter). Timeout은 응답을 무한정 기다리지 않고 임계를 넘으면 실패로 처리 — 자원 반환. Bulkhead는 자원 풀을 격리해 한 서비스 장애가 다른 부분으로 번지지 않게 한다(선박의 격벽 비유).',
    tip:
      'exponential backoff에 jitter를 왜 넣나요?\n타임아웃 값은 어떻게 결정하는 게 좋을까요?',
  },
  {
    content: 'Observability의 3요소는 뭔가?',
    categoryKey: 'backend',
    answer:
      'Logs(무슨 일이 일어났나 — 이벤트 기록), Metrics(집계 수치 — 초당 요청·에러율·지연), Traces(요청이 서비스를 어떻게 흘렀나 — 분산 추적). 셋이 상호 보완적이며, 최근엔 OpenTelemetry가 표준 수집 규격으로 자리 잡음.',
    tip:
      'sampling을 트레이스에 적용할 때 편향은 어떻게 관리하나요?\nRED와 USE 방법론은 각각 뭘 보는 접근인가요?',
  },
  {
    content: '12-Factor App의 핵심 원칙 몇 가지만 말한다면?',
    categoryKey: 'backend',
    answer:
      '(1) codebase 하나에 여러 배포 (2) 의존성을 명시적으로 선언·격리 (3) 설정은 환경변수로 (4) backing service를 붙였다 뗐다 할 수 있게 (5) build/release/run 분리 (6) stateless 프로세스 (7) 포트 바인딩으로 서비스 노출. 컨테이너 시대에 특히 잘 맞는 원칙들이다.',
    tip:
      '"stateless 프로세스" 원칙과 세션은 어떻게 조화시키나요?\n왜 로그를 파일이 아니라 stdout으로 흘려보내라고 하나요?',
  },
  {
    content: 'Reverse Proxy가 하는 역할은?',
    categoryKey: 'backend',
    answer:
      '클라이언트 요청을 백엔드로 대신 전달·응답. 로드밸런싱, SSL 종료, 캐싱, 헤더 재작성, 인증 게이트, 경로별 마이크로서비스 라우팅 등. Nginx·Envoy·HAProxy·Traefik 등이 대표.',
    tip:
      'forward proxy와 뭐가 다른가요?\nSSL termination을 프록시에서 하면 어떤 장단점이 있나요?',
  },
  {
    content: 'Redis를 캐시로 쓸 때 고려사항은?',
    categoryKey: 'backend',
    answer:
      '메모리 상한(maxmemory)과 eviction 정책(LRU/LFU/TTL), 캐시 스탬피드 방지(single flight, jitter TTL), 캐시 일관성(원본 갱신 시 무효화 방식), Persistence(RDB/AOF)와 데이터 손실 허용 범위, 클러스터/센티널로 HA 확보. 세션·랭킹·pub/sub 같은 부수적 용도도 잦다.',
    tip:
      'RDB와 AOF의 트레이드오프는 뭔가요?\nRedis Cluster의 slot 개념이 왜 중요한가요?',
  },
  {
    content: 'Elasticsearch의 역인덱스(inverted index) 원리는?',
    categoryKey: 'backend',
    answer:
      '문서를 토큰(term)으로 분석한 뒤, term→문서 리스트 매핑을 만들어 저장. 검색 시 term을 lookup해 매칭 문서를 즉시 찾는다. 아날라이저(형태소·소문자·stop word)가 인덱싱/검색 양쪽에 동일하게 적용돼야 결과가 일관된다.',
    tip:
      'shard와 replica는 성능·가용성에 어떻게 영향을 주나요?\n한글 검색을 위해선 어떤 아날라이저가 필요할까요?',
  },
  {
    content: 'Kafka의 파티션 개념은 뭐고 왜 중요한가?',
    categoryKey: 'backend',
    answer:
      'Topic을 여러 파티션으로 쪼개 병렬 처리·확장이 가능. 같은 파티션 안에서는 순서가 보장되지만 파티션 간에는 X — key 해싱으로 특정 키의 이벤트가 같은 파티션에 가도록 유도. 컨슈머 그룹의 각 컨슈머가 파티션을 나눠 처리한다.',
    tip:
      '컨슈머 수를 파티션 수보다 많이 두면 어떻게 되나요?\n메시지 순서를 전역 보장하고 싶으면 어떻게 해야 하나요?',
  },
  {
    content: 'gRPC를 REST 대신 쓰는 이유는?',
    categoryKey: 'backend',
    answer:
      'protobuf 스키마로 타입 안전·자동 코드 생성, HTTP/2 기반이라 스트리밍·멀티플렉싱 지원, 페이로드가 작고 빠름. 서비스 간 통신에 유리하지만 브라우저에서 직접 호출은 제약이 커 gRPC-Web/proxy가 필요. 스키마·버저닝을 미리 관리해야 함.',
    tip:
      'protobuf의 forward/backward compatibility는 어떻게 지키나요?\n스트리밍(client/server/bidirectional)은 언제 쓰나요?',
  },
  {
    content: 'GraphQL의 장단점은?',
    categoryKey: 'backend',
    answer:
      '장점: 클라이언트가 원하는 필드만 요청 → over/under-fetching 해소, 하나의 엔드포인트, 스키마가 계약. 단점: N+1 위험(DataLoader 필수), 캐싱이 HTTP GET 기반 CDN과 잘 안 맞음, 쿼리 복잡도 제어·인증/권한 설계 부담이 REST보다 큼.',
    tip:
      'DataLoader가 N+1을 어떻게 해결하나요?\npersisted query는 어떤 문제를 푸는지 아나요?',
  },
  {
    content: 'Backend for Frontend(BFF) 패턴은 뭔가?',
    categoryKey: 'backend',
    answer:
      '각 프론트(웹·iOS·안드로이드)마다 전용 백엔드 레이어를 두어, 화면 요구에 맞춰 aggregation·변환·인증을 수행. 프론트가 직접 마이크로서비스들을 오케스트레이션할 필요를 줄이고, 각 프론트의 진화 속도를 독립적으로 유지할 수 있다.',
    tip:
      'BFF가 오히려 복잡도를 늘리는 상황은 언제인가요?\nBFF와 API Gateway의 차이는?',
  },
  {
    content: 'Saga 패턴은 분산 트랜잭션을 어떻게 다루나?',
    categoryKey: 'backend',
    answer:
      '여러 서비스에 걸친 일련의 로컬 트랜잭션과 각 단계의 보상(compensating) 트랜잭션으로 구성. 중간에 실패하면 보상 액션을 역순으로 실행해 최종 일관성 확보. 오케스트레이션(중앙 조정자)과 코레오그래피(이벤트 기반)로 구현.',
    tip:
      '보상 트랜잭션이 실패하면 어떻게 처리하나요?\nSaga는 언제 2PC보다 유리한가요?',
  },
  {
    content: 'Event Sourcing과 CQRS는 뭔가?',
    categoryKey: 'backend',
    answer:
      'Event Sourcing은 상태 대신 이벤트 이력을 저장 — 현재 상태는 이벤트를 재생해 도출. 과거 어느 시점으로도 복원·감사 가능. CQRS는 명령(쓰기)과 조회(읽기) 모델을 분리 — 각각을 다른 스토리지·최적화로 다룰 수 있다. 자주 함께 쓰이지만 필수는 아니다.',
    tip:
      '이벤트 스키마 변경(evolution)은 어떻게 다루나요?\nCQRS의 read model 갱신 지연은 UX에서 어떻게 감추나요?',
  },
  {
    content: '마이크로서비스 vs 모놀리스의 트레이드오프는?',
    categoryKey: 'backend',
    answer:
      '마이크로서비스는 팀·배포·확장이 독립적이지만 네트워크 호출·분산 트랜잭션·관측/보안 복잡도가 급증. 모놀리스는 초기 개발·디버깅·트랜잭션이 단순하지만 팀·배포가 커플링. 대부분 조직은 "모놀리스로 시작해 필요해질 때 분리"가 실전적 정답.',
    tip:
      '모놀리스에서 마이크로서비스로 갈아탈 신호는 뭐가 있을까요?\n"분산 모놀리스"라는 안티패턴은 왜 생기나요?',
  },
  {
    content: 'SPOF(Single Point of Failure)를 어떻게 제거하나?',
    categoryKey: 'backend',
    answer:
      '중복화(active-active 또는 active-standby), 여러 AZ/리전 배치, 로드밸런서 자체도 다중화, DB는 replica+failover, 상태를 stateless 계층에 두지 않기, DNS TTL 짧게. 정기적 카오스 실험으로 SPOF를 사전에 발견.',
    tip:
      'DNS 자체는 SPOF가 될 수 있나요?\nMulti-region active-active가 왜 그렇게 어려운 문제인가요?',
  },
  {
    content: '로그 레벨(DEBUG/INFO/WARN/ERROR)을 나누는 이유는?',
    categoryKey: 'backend',
    answer:
      '운영 중 시끄러움을 조절하고 알람의 시그널/노이즈 비를 유지하기 위함. DEBUG는 개발/장애 조사 시만, INFO는 주요 상태 전이, WARN은 자동 복구했으나 주의 필요, ERROR는 사용자 영향 있는 실패. 프로덕션은 INFO 이상만 남기고 DEBUG는 온디맨드로 켜는 게 흔한 관행.',
    tip:
      '구조화된 로그(JSON)를 쓰는 이유는 뭔가요?\nPII·비밀번호 등을 로그에서 자동으로 마스킹하려면 어떻게 하나요?',
  },
  {
    content: 'Zero Downtime 배포를 위해 필요한 조건들은?',
    categoryKey: 'backend',
    answer:
      '롤링 or Blue/Green 인프라, 스키마 변경은 backward compatible한 단계로 쪼개기(add column → deploy → backfill → deploy → drop old), graceful shutdown(SIGTERM에 신규 요청 거부하고 in-flight 완료), 로드밸런서 헬스체크와 draining 시간 확보, 세션을 외부 저장소로.',
    tip:
      'DB 스키마의 backward-compat 단계 배포는 왜 그렇게 오래 걸리나요?\nlong-running 요청은 배포 때 어떻게 처리하나요?',
  },
  {
    content: 'RBAC와 ABAC 접근 제어의 차이는?',
    categoryKey: 'backend',
    answer:
      'RBAC는 사용자에게 역할(role)을 부여하고 역할에 권한을 매핑 — 관리가 단순. ABAC는 사용자·리소스·환경의 속성을 조건으로 평가(예: "같은 팀이고 근무시간이면 편집") — 유연하지만 정책이 복잡. 실전에선 RBAC 기본에 필요한 곳만 ABAC로 보강.',
    tip:
      'RBAC에서 역할이 폭증(role explosion)하는 문제는 어떻게 다루나요?\nOPA(Open Policy Agent)는 어떤 문제를 푸나요?',
  },
  {
    content: '서버 성능 튜닝의 우선순위는?',
    categoryKey: 'backend',
    answer:
      '먼저 측정 — 프로파일링·APM으로 실제 병목을 찾고 추측하지 않는다. 병목의 성격(CPU/IO/네트워크/DB)에 맞는 최적화 적용. 알고리즘·쿼리·인덱스·캐싱·병렬화 순으로 큰 이득 가능성 높은 것부터. 최적화 후에도 재측정으로 회귀 확인.',
    tip:
      'p95·p99 지연을 개선할 때 평균만 봐선 안 되는 이유는?\n"early optimization is evil"과 언제 균형을 잡아야 하나요?',
  },
  {
    content: 'CSS Box Model의 4 요소는?',
    categoryKey: 'frontend',
    answer:
      'content(실제 내용), padding(내용과 border 사이 여백), border(테두리), margin(요소 바깥 여백). box-sizing이 content-box면 width가 content 기준이라 padding/border를 더해야 실제 크기가 나오고, border-box면 width에 모든 게 포함돼 계산이 직관적이다.',
    tip:
      '왜 대부분 프로젝트에서 `* { box-sizing: border-box }`를 쓰나요?\nmargin collapse(마진 병합)는 왜 생기고 어떻게 다루나요?',
  },
  {
    content: 'Flexbox와 Grid는 각각 언제 유리한가?',
    categoryKey: 'frontend',
    answer:
      'Flex는 1차원(한 방향으로 배치)이라 툴바·리스트·정렬에 자연스럽다. Grid는 2차원(행+열)이라 페이지 레이아웃·복잡한 카드 그리드에 강하다. 둘을 섞어 쓰는 게 실전 — 큰 뼈대는 Grid, 개별 셀 안 정렬은 Flex.',
    tip:
      'grid-template-areas는 어떤 상황에 편한가요?\n반응형에서 minmax와 auto-fit/auto-fill은 어떻게 쓰나요?',
  },
  {
    content: 'z-index가 예상대로 동작하지 않는 대표적 이유는?',
    categoryKey: 'frontend',
    answer:
      'z-index는 stacking context 안에서만 유효하다. transform·opacity(<1)·filter 등이 붙은 조상 요소가 새 stacking context를 만들면 자식의 z-index가 아무리 커도 그 컨텍스트를 벗어나지 못한다. position이 static이면 z-index 자체가 적용 안 됨.',
    tip:
      'position: sticky와 z-index는 어떻게 상호작용하나요?\nstacking context를 명시적으로 만들고 싶으면 뭘 쓰나요?',
  },
  {
    content: 'position absolute · relative · fixed · sticky의 차이는?',
    categoryKey: 'frontend',
    answer:
      'static은 흐름대로. relative는 원 자리에서 offset만 이동(주변 흐름 유지). absolute는 문서 흐름 이탈, 가장 가까운 positioned 조상 기준. fixed는 뷰포트 고정(스크롤해도 그대로). sticky는 스크롤 위치에 따라 relative→fixed로 전환(부모 경계 내).',
    tip:
      'sticky가 안 먹히는 흔한 원인은 뭐가 있나요?\ntransform이 fixed의 기준을 바꾸는 이슈를 겪은 적 있나요?',
  },
  {
    content: 'JS 이벤트 루프에서 마이크로태스크와 매크로태스크는 어떻게 다르나?',
    categoryKey: 'frontend',
    answer:
      '스택이 비면 이벤트 루프는 마이크로태스크 큐를 전부 비우고 그 다음 렌더링, 그 후 매크로태스크(setTimeout, I/O) 하나를 처리한다. Promise.then/queueMicrotask는 마이크로태스크, setTimeout/setInterval은 매크로태스크. 마이크로태스크 안에서 새 마이크로태스크를 계속 넣으면 렌더링이 굶는다.',
    tip:
      'Promise.resolve().then은 왜 setTimeout(fn,0)보다 먼저 실행되나요?\nrequestAnimationFrame은 어느 큐에 속하나요?',
  },
  {
    content: 'Promise와 async/await의 관계는?',
    categoryKey: 'frontend',
    answer:
      'async 함수는 항상 Promise를 반환한다. await는 Promise가 resolve될 때까지 함수 실행을 일시 중단하는 문법 설탕 — 내부적으로는 .then 체이닝과 동일. 에러는 try/catch로 잡을 수 있어 콜백 지옥·중첩 .then보다 가독성이 좋아진다.',
    tip:
      'await가 없는 async 함수는 무슨 의미가 있나요?\nPromise.all·allSettled·race·any는 어떻게 다른가요?',
  },
  {
    content: '클로저(closure)란 무엇이고 언제 유용한가?',
    categoryKey: 'frontend',
    answer:
      '함수가 자신이 정의된 스코프의 변수를 계속 참조할 수 있는 특성. 함수가 다른 스코프로 전달되어도 해당 변수를 기억한다. 비공개 상태 은닉(모듈 패턴), 콜백에서 지연 계산, 함수 팩토리(카운터, 커링) 등에 자연스럽다.',
    tip:
      '반복문 안에서 var로 setTimeout을 등록했을 때 클로저 이슈가 왜 생기나요?\n메모리 누수와 클로저는 어떻게 연결되나요?',
  },
  {
    content: 'JS의 this 바인딩 규칙은?',
    categoryKey: 'frontend',
    answer:
      '(1) 기본은 undefined(strict)/전역 (2) 메서드 호출 obj.fn()이면 obj (3) call/apply/bind로 명시 지정 (4) new fn()이면 새 인스턴스 (5) 화살표 함수는 자기 this를 갖지 않고 lexical this를 그대로 상속. 우선순위는 new > 명시 > 묵시 > 기본.',
    tip:
      'React 클래스 컴포넌트에서 constructor의 bind(this)가 왜 필요했나요?\n화살표 함수가 메서드로 안 좋은 상황도 있나요?',
  },
  {
    content: 'Debounce와 Throttle의 차이는?',
    categoryKey: 'frontend',
    answer:
      'Debounce는 마지막 호출 후 N ms 조용해야 한 번 실행 — 자동완성·검색어 확정. Throttle은 N ms에 최대 1회로 제한 — 스크롤·리사이즈처럼 지속적 이벤트. 사용자 의도에 맞춰 골라야 UX가 자연스럽다.',
    tip:
      'leading/trailing 옵션은 어떤 상황에 각각 유용한가요?\n둘 다 lodash 없이 직접 짤 수 있나요?',
  },
  {
    content: '웹 접근성(a11y)의 주요 원칙은?',
    categoryKey: 'frontend',
    answer:
      'Perceivable(대체 텍스트·자막), Operable(키보드로 모든 조작), Understandable(예측 가능한 UI·명확한 레이블), Robust(스크린리더 호환·시맨틱). WCAG 2.x가 표준. 시맨틱 HTML을 우선하고 ARIA는 필요할 때만 최소로.',
    tip:
      '"first rule of ARIA"는 뭔가요?\nfocus management는 SPA에서 왜 특히 중요한가요?',
  },
  {
    content: 'CSR · SSR · SSG · ISR의 차이는?',
    categoryKey: 'frontend',
    answer:
      'CSR은 브라우저에서 렌더 — 초기 HTML은 껍데기. SSR은 요청 시 서버에서 HTML 생성 — SEO/첫 픽셀 빠름. SSG는 빌드 시 미리 HTML 생성 — CDN 캐시로 초고속. ISR은 SSG를 일정 시간마다 재생성 — 정적 이점과 신선함의 절충. Next.js의 기본 전략들이다.',
    tip:
      'ISR revalidation 도중 오래된 페이지가 서빙되는 게 왜 UX상 나쁘지 않나요?\nedge SSR은 왜 최근 각광받나요?',
  },
  {
    content: 'React 하이드레이션(hydration)이 뭐고 Suspense는 어떻게 연결되나?',
    categoryKey: 'frontend',
    answer:
      'SSR로 그린 정적 HTML에 클라이언트가 이벤트 리스너를 붙여 interactive하게 만드는 과정. Suspense는 서브트리 렌더를 지연시키고 fallback을 보여주며, React 19의 streaming SSR과 결합해 부분 하이드레이션·선택적 하이드레이션을 지원한다.',
    tip:
      'hydration mismatch 경고는 왜 생기고 어떻게 진단하나요?\nreact-server-components는 하이드레이션 부담을 어떻게 줄이나요?',
  },
  {
    content: 'React 훅의 규칙 두 가지는?',
    categoryKey: 'frontend',
    answer:
      '(1) 훅은 최상위에서만 호출한다 — 반복문·조건문·중첩 함수 안에서 금지. (2) 훅은 React 함수 컴포넌트나 커스텀 훅에서만 호출한다. 이 규칙은 React가 호출 순서로 훅 상태를 매칭하기 때문 — 위반 시 상태가 뒤바뀌거나 훅 개수 불일치 오류가 난다.',
    tip:
      'ESLint react-hooks 플러그인이 하는 검사들은 뭐가 있나요?\n조건부로 훅을 쓰고 싶다면 대신 어떤 패턴을 쓰나요?',
  },
  {
    content: 'Context API의 장단점과 대안은?',
    categoryKey: 'frontend',
    answer:
      '장점: 별도 라이브러리 없이 prop drilling 해소, 테마·인증 같은 전역값에 자연스러움. 단점: value가 바뀌면 해당 Provider 하위 전부 리렌더 → 큰 데이터·자주 변하는 상태엔 부적합. 이런 경우 Redux/Zustand/Jotai가 선택적 구독을 지원한다.',
    tip:
      'Context를 여러 개로 쪼개는 게 왜 리렌더 최적화에 도움이 되나요?\nuseSyncExternalStore는 어떤 상황에서 빛나나요?',
  },
  {
    content: 'Web Vitals(LCP, INP, CLS)이 무엇이고 어떻게 개선하나?',
    categoryKey: 'frontend',
    answer:
      'LCP(가장 큰 콘텐츠 픽셀이 그려질 때까지, 2.5s 이하 목표) — 이미지·서버 응답·SSR 개선. INP(사용자 상호작용 응답 지연, 200ms 이하) — 무거운 JS 줄이기, 스케줄링. CLS(레이아웃 이동 누적, 0.1 이하) — 미리 공간 예약(width/height, aspect-ratio).',
    tip:
      'INP가 이전 지표 FID를 대체한 이유는 뭔가요?\nCore Web Vitals가 SEO 순위에 얼마나 영향을 준다고 알려져 있나요?',
  },
  {
    content: '번들 사이즈를 줄이는 방법들은?',
    categoryKey: 'frontend',
    answer:
      'Tree shaking(사용 안 하는 코드 제거), code splitting(라우트·컴포넌트 단위 dynamic import), 큰 라이브러리 경량 대안으로 교체(dayjs vs moment), 이미지·아이콘을 sprite/SVG로, gzip/brotli 압축, prod build에서 sourcemap 분리. Bundle Analyzer로 실제 병목 확인 후 손대는 게 정석.',
    tip:
      'CommonJS 모듈이 tree shaking을 방해하는 이유는 뭔가요?\ndynamic import는 어느 시점에 chunk를 로드하나요?',
  },
  {
    content: 'TypeScript의 대표 유틸리티 타입 몇 가지는?',
    categoryKey: 'frontend',
    answer:
      'Partial<T>(모든 필드 optional), Required<T>(모두 필수), Pick<T,K>(선택 필드만), Omit<T,K>(제외), Record<K,V>(맵), Readonly<T>(불변), ReturnType<F>·Parameters<F>(함수에서 추출). 도메인 타입 하나에서 파생 타입을 안전하게 만들어 중복을 줄인다.',
    tip:
      'Partial과 DeepPartial은 뭐가 다른가요?\ntemplate literal types로 뭘 할 수 있나요?',
  },
  {
    content: 'JS 프로토타입 체인과 상속은 어떻게 동작하나?',
    categoryKey: 'frontend',
    answer:
      '모든 객체는 내부 [[Prototype]] 링크를 갖고, 프로퍼티 조회 시 자기 자신에 없으면 이 링크를 따라 위로 올라간다. Object.create·class 문법 모두 결국 이 체인을 구성 — class는 문법 설탕이지 새 상속 모델이 아니다. 최상위는 Object.prototype이고 그 위는 null.',
    tip:
      'Object.create(null)은 어떤 상황에 쓰이나요?\nclass 문법의 super 호출은 내부적으로 뭘 하나요?',
  },
  {
    content: 'Reflow와 Repaint의 차이는? 성능 관점에서 왜 중요한가?',
    categoryKey: 'frontend',
    answer:
      'Reflow(layout)는 요소의 크기·위치가 바뀌어 레이아웃을 다시 계산하는 것 — 자식·이후 형제에게 전파돼 비싸다. Repaint는 색·배경 등 시각 속성만 바뀌어 픽셀만 다시 그리는 것 — 상대적으로 저렴. width·height·top 등 변경은 reflow를 일으키므로 transform·opacity로 compositor-only 애니메이션을 유도하는 게 정석.',
    tip:
      'will-change 프로퍼티는 어떤 상황에 유효하고 남용하면 왜 안 좋나요?\nFLIP 애니메이션 기법은 reflow를 어떻게 피하나요?',
  },
  {
    content: 'LocalStorage · SessionStorage · IndexedDB의 차이는?',
    categoryKey: 'frontend',
    answer:
      'LocalStorage는 문자열 KV(용량 5~10MB), 탭·세션과 무관하게 영구. SessionStorage는 같은 스펙이지만 탭 단위로 격리·탭 닫으면 소멸. IndexedDB는 구조화된 객체·인덱스·트랜잭션을 지원하는 비동기 NoSQL(수백 MB+) — 이미지·큰 캐시·오프라인 데이터에 적합. 모두 same-origin으로 격리된다.',
    tip:
      '왜 LocalStorage 접근이 동기라서 성능 문제가 되나요?\nCache Storage API와 IndexedDB는 각각 어디에 쓰나요?',
  },
] as const;
