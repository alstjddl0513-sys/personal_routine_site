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
  { name: '우아한형제들', rssUrl: 'https://techblog.woowahan.com/feed/', siteUrl: 'https://techblog.woowahan.com' },
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

// CS interview 기초. 분포: CS기초 8 · 네트워크 5 · DB 4 · 백엔드 7 · 프론트 6.
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
] as const;
