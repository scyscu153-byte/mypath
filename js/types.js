/**
 * 데이터 계약 (Data Contract)
 * ─────────────────────────────────────────────────────────
 * UI(js/ui.js)와 파이프라인(js/pipeline.js)이 공유하는 데이터 모양.
 * 이 파일이 두 작업의 경계다. 여기 정의된 모양대로 주고받는다.
 *
 * ⚠️ 이 파일을 수정하면 양쪽 모두에 영향이 간다. 변경 시 팀에 공유할 것.
 *
 * 실행 로직은 없다. 타입 정의(JSDoc) + 상수 + mock 데이터만 둔다.
 */

// ─────────────────────────────────────────────
//  1. 프로필 — 사용자의 현재 상태
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Profile
 * @property {string}   id                  세션 식별자 (localStorage 키)
 * @property {number}   grade               학년 (1~3)
 * @property {string}   department          학과
 * @property {number|null} age              나이 (선택)
 * @property {string[]} certificates        보유 자격증
 * @property {string[]} skills              보유 기술 (언어·툴·경험)
 * @property {CompletedActivity[]} completedActivities  이행 완료한 프로그램
 * @property {Traits}   traits              서브 기준 (선택, 추천 보정용)
 * @property {string}   updatedAt           마지막 갱신 (ISO 8601)
 */

/**
 * @typedef {Object} CompletedActivity
 * @property {string} programTitle   프로그램명
 * @property {string} gainedSkill    이 프로그램으로 얻은 역량
 * @property {string} completedAt    이행 표시한 시각 (ISO 8601)
 */

/**
 * 서브 기준. 별도 설문 화면을 만들지 않는다.
 * 입력 단계의 선택 항목 1~2개로만 받고, 프롬프트에 부드러운 보정 신호로 전달한다.
 * @typedef {Object} Traits
 * @property {'team'|'solo'|null} activityPreference  팀 활동 선호 / 개인 활동 선호
 */

// ─────────────────────────────────────────────
//  2. 목표 — 사용자가 도달하려는 곳
// ─────────────────────────────────────────────

/**
 * @typedef {Object} Target
 * @property {string}  id
 * @property {string}  profileId
 * @property {string}  companyOrRole     목표 기업명 또는 직군
 * @property {boolean} globalInterest    글로벌 진출 희망 여부
 * @property {string|null} jobPostingUrl 사용자가 직접 붙여넣은 실제 채용공고 URL (선택)
 * @property {RequiredSkill[]} requiredSkills  검색으로 파악된 요구 역량
 * @property {GapSkill[]}      gapSkills       갭 분석 결과
 * @property {string}  createdAt
 */

/**
 * 목표 기업이 요구하는 역량 (2단계 · sonar-pro 실시간 검색 결과)
 * @typedef {Object} RequiredSkill
 * @property {string} name       역량명 (예: "Spring Boot")
 * @property {string} reason     왜 필요한지 (검색 근거 요약)
 * @property {string} sourceUrl  출처 URL — 없으면 표시하지 않는다
 */

/**
 * 부족한 역량 (3단계 · 갭 분석 결과)
 * @typedef {Object} GapSkill
 * @property {string} name       역량명
 * @property {string} reason     왜 부족하다고 판단했는지
 * @property {'high'|'medium'|'low'} priority  우선순위
 */

// ─────────────────────────────────────────────
//  3. 추천 결과 — 갭을 메울 교내 프로그램
// ─────────────────────────────────────────────

/**
 * @typedef {Object} ProgramMatch
 * @property {string}  id
 * @property {string}  targetId
 * @property {string}  gapSkill        어떤 갭을 메우는 추천인지
 * @property {string}  programTitle    프로그램명
 * @property {string}  summary         한 줄 요약
 * @property {string}  sourceUrl       원문 URL — ★필수. 없으면 결과에서 제외
 * @property {string}  sourceDomain    출처 도메인 — mjc.ac.kr 검증용
 * @property {string|null} postedAt    공지 게시일 (오래된 정보 구분용)
 * @property {string|null} deadline    마감일 (추정 — "확인 필요" 문구 동반)
 * @property {PersonaScores} personaScores  4개 모델의 평가
 * @property {number}  disagreement    의견 갈림 정도 0~1 (클수록 갈림)
 * @property {boolean} isCompleted     이행 여부
 *
 * ─ 개선사항.md P0-1 (신찬영 담당, 아직 검증 전이면 null/undefined) ─
 * @property {'verified'|'unverified'|'broken'|null} [sourceStatus]  서버 측 URL 검증 결과
 * @property {string|null} [sourceCheckedAt]  검증 시각 (ISO 8601)
 * @property {string|null} [sourceError]      검증 실패 사유
 *
 * ─ 개선사항.md P0-2 (신찬영 담당, 아직 미적용이면 undefined) ─
 * @property {'open'|'upcoming'|'ongoing'|'unknown'|'closed'} [availability]  모집 상태
 * @property {'verified'|'estimated'|'unknown'} [dateConfidence]
 * @property {string|null} [applicationStartAt]
 * @property {string|null} [applicationEndAt]
 * @property {string|null} [eventStartAt]
 * @property {string|null} [eventEndAt]
 *
 * ─ 교외 활동 (사용자가 켰을 때만) ─
 * @property {'campus'|'external'} [scope]  교내(기본)인지 교외인지.
 *   ★없으면 'campus' 로 본다.★ 화면·검증·고지가 이 값에 따라 갈리므로,
 *   교외 항목에는 반드시 'external' 이 붙어 있어야 한다.
 * @property {string|null} [host]  교외 항목의 주관 기관 (교내는 department 를 쓴다)
 */

/**
 * 4개 모델이 서로 다른 관점에서 평가한 결과.
 * ⚠️ 4개가 같은 답을 하면 "기믹"으로 읽힌다.
 *    disagreement 가 높은 항목을 화면에서 강조해 "왜 4개를 쓰는가"를 증명한다.
 * @typedef {Object} PersonaScores
 * @property {PersonaVerdict} practitioner  실무 관점 (현직자 시각)
 * @property {PersonaVerdict} professor     학업 연계 관점 (교수 시각)
 * @property {PersonaVerdict} senior        비용·시간 효율 관점 (선배 시각)
 * @property {PersonaVerdict} market        시장 트렌드 관점 (분석가 시각)
 */

/**
 * @typedef {Object} PersonaVerdict
 * @property {number} score    0~10
 * @property {string} comment  한 줄 평가
 */

// ─────────────────────────────────────────────
//  4. 파이프라인 진행 상태 — UI 진행 표시용
// ─────────────────────────────────────────────

/** 파이프라인 단계 식별자 */
export const STAGE = Object.freeze({
  REQUIRED_SKILLS: 'requiredSkills', // 2단계 · 요구 역량 검색
  GAP_ANALYSIS: 'gapAnalysis',       // 3단계 · 갭 분석
  PROGRAM_SEARCH: 'programSearch',   // 4단계 · 교내 프로그램 검색
  PERSONA_REVIEW: 'personaReview',   // 5단계 · 4인 병렬 평가
});

/** UI에 표시할 단계별 문구 */
export const STAGE_LABEL = Object.freeze({
  [STAGE.REQUIRED_SKILLS]: '요구 역량을 실시간으로 찾고 있어요',
  [STAGE.GAP_ANALYSIS]: '내 프로필과 비교해 부족한 부분을 찾고 있어요',
  [STAGE.PROGRAM_SEARCH]: '학교 곳곳에서 그 갭을 메울 프로그램을 찾고 있어요',
  [STAGE.PERSONA_REVIEW]: '4개의 AI가 각자 다른 관점에서 평가하고 있어요',
});

/**
 * 파이프라인 진행 콜백에 전달되는 값
 * @typedef {Object} StageEvent
 * @property {string}  stage    STAGE 중 하나
 * @property {'start'|'done'|'error'} status
 * @property {*}       [data]   done 일 때의 중간 결과
 * @property {string}  [message] error 일 때의 사유
 */

// ─────────────────────────────────────────────
//  5. 페르소나 정의 — 파이프라인·UI 공용
// ─────────────────────────────────────────────

export const PERSONAS = Object.freeze([
  { key: 'practitioner', label: '실무 관점', sub: '현직자 시각', question: '실제 역량 습득에 도움이 되는가' },
  { key: 'professor',    label: '학업 연계', sub: '교수 시각',   question: '전공·전공심화와 시너지가 나는가' },
  { key: 'senior',       label: '비용·시간', sub: '선배 시각',   question: '투자 대비 가치가 있는가' },
  { key: 'market',       label: '시장 트렌드', sub: '분석가 시각', question: '채용 시장에서 통하는 역량인가' },
]);

// ─────────────────────────────────────────────
//  6. 신뢰성 규칙 — 화면 문구를 여기서 통일한다
// ─────────────────────────────────────────────

/**
 * 설계 원칙: 우리는 자격을 판정하지 않는다.
 * 신청 자격·학년 제한·중복 참여 제한은 학칙에 있어 웹에서 확인되지 않는다.
 * "된다"고 단정하면 학생이 헛걸음한다.
 */
export const DISCLAIMER = Object.freeze({
  ELIGIBILITY: '자격 요건은 원문에서 확인하세요',
  DEADLINE_UNCERTAIN: '마감일은 원문 확인 필요',
  NO_SOURCE: '출처가 확인되지 않아 표시하지 않습니다',

  /**
   * ★ 판별의 한계를 먼저 밝힌다.
   *
   *   프로그램이 아닌 게시글의 차단율은 실측 92.4%다 (게시글 1,055건 기준).
   *   나머지를 더 걷어내려면 기준을 높여야 하는데, 그러면 실제 교내 프로그램이
   *   함께 배제되는 것을 측정으로 확인했다 (최대 46%까지 유실).
   *   ★누락보다 오탐이 낫다★ 는 판단으로 현재 기준을 유지하고,
   *   대신 그 한계를 화면에 명시한다.
   */
  // ★"정확도"라고 쓰면 안 된다.★
  //   우리가 실제로 잰 92.4%는 "프로그램이 아닌 게시글을 걸러낸 비율"(차단율)이지
  //   accuracy 가 아니다. accuracy 는 계산한 적이 없다.
  //   측정하지 않은 지표 이름을 화면에 쓰는 것은,
  //   45.5% 같은 불리한 수치를 자진 공개해서 번 신뢰를 스스로 깎는 일이다.
  PURITY: '프로그램이 아닌 게시글은 실측 92% 걸러냅니다. 나머지 일부가 섞일 수 있으니 신청 전 원문에서 주관 기관을 확인하세요',
  PURITY_SHORT: '일부 외부 기관 프로그램이 포함될 수 있습니다',
});

/** 결과에 포함할 출처 도메인. 이 목록 밖이면 버린다. */
export const ALLOWED_DOMAIN = 'mjc.ac.kr';

// ─────────────────────────────────────────────
//  7. mock 데이터 — UI를 먼저 만들기 위한 가짜 값
//     실제 파이프라인이 붙으면 이 모양 그대로 대체된다.
// ─────────────────────────────────────────────

/** @type {Profile} */
export const MOCK_PROFILE = {
  id: 'mock',
  grade: 1,
  department: 'AI게임소프트웨어학과',
  age: null,
  certificates: [],
  skills: ['C#', 'Unity', 'HTML/CSS'],
  completedActivities: [],
  traits: { activityPreference: null },
  updatedAt: '2026-08-06T20:00:00+09:00',
};

/** @type {Target} */
export const MOCK_TARGET = {
  id: 'mock-target',
  profileId: 'mock',
  companyOrRole: '게임 클라이언트 개발자',
  globalInterest: false,
  requiredSkills: [
    { name: 'Unity', reason: '대부분의 국내 게임사 클라이언트 직군이 요구', sourceUrl: 'https://example.mjc.ac.kr/a' },
    { name: 'C#', reason: 'Unity 스크립팅의 기본 언어', sourceUrl: 'https://example.mjc.ac.kr/b' },
    { name: '포트폴리오(개인 프로젝트)', reason: '신입 채용에서 실물 결과물을 요구', sourceUrl: 'https://example.mjc.ac.kr/c' },
    { name: '협업 경험(Git)', reason: '팀 단위 개발 경험을 공통적으로 명시', sourceUrl: 'https://example.mjc.ac.kr/d' },
  ],
  gapSkills: [
    { name: '포트폴리오(개인 프로젝트)', reason: '보유 기술은 있으나 완성 결과물 기록이 없음', priority: 'high' },
    { name: '협업 경험(Git)', reason: '팀 프로젝트 이력이 프로필에 없음', priority: 'medium' },
  ],
  createdAt: '2026-08-06T20:00:00+09:00',
};

/** @type {ProgramMatch[]} */
export const MOCK_MATCHES = [
  {
    id: 'm1',
    targetId: 'mock-target',
    gapSkill: '포트폴리오(개인 프로젝트)',
    programTitle: '2026학년도 하계방학 AI 비교과 프로그램',
    summary: 'AI 코딩·자동화 실습 후 해커톤으로 결과물을 만드는 프로그램',
    sourceUrl: 'https://cls.mjc.ac.kr/bbs/data/view.do?data_idx=BD0000000073',
    sourceDomain: 'cls.mjc.ac.kr',
    postedAt: '2026-07-15',
    deadline: null,
    personaScores: {
      practitioner: { score: 9, comment: '결과물이 남는 형태라 포트폴리오에 직접 쓸 수 있음' },
      professor:    { score: 7, comment: '전공 교과와 연결되나 학점 인정은 없음' },
      senior:       { score: 8, comment: '방학 중 단기라 학기 부담이 적음' },
      market:       { score: 6, comment: 'AI 실습 경험은 게임 클라이언트 직군에서 가점 정도' },
    },
    // ★ 실제 파이프라인 공식과 같아야 한다: (최고점 − 최저점) / 10.
    //   9,7,8,6 → spread 3 → 0.3. 임계값이 0.5 이므로 ⚡ 배지는 뜨지 않는다.
    //   전에는 여기가 0.4로 적혀 있었는데, 그래도 안 뜨는 값이라 결과는 같았지만
    //   ?mock=1 로 리허설할 때 보이는 화면이 본 시연과 어긋날 수 있는 구조였다.
    disagreement: 0.3,
    isCompleted: false,
  },
  {
    id: 'm2',
    targetId: 'mock-target',
    gapSkill: '협업 경험(Git)',
    programTitle: 'WE-GO 현장실습 학기제 (자율)',
    summary: '방학 중 2주 전일제 현장실습, 2학점 인정',
    sourceUrl: 'https://sanhak.mjc.ac.kr/user/Cts/Cts0201.do',
    sourceDomain: 'sanhak.mjc.ac.kr',
    postedAt: null,
    deadline: null,
    personaScores: {
      practitioner: { score: 9, comment: '실제 팀에서 협업 도구를 쓰게 되므로 갭 해소에 직접적' },
      professor:    { score: 9, comment: '학점(2학점) 인정까지 되어 학업과 병행 가능' },
      senior:       { score: 3, comment: '2주 전일제라 방학 일정을 통째로 쓴다. 1학년에겐 부담이 큼' },
      market:       { score: 8, comment: '신입 채용에서 실무 경험은 명확한 가점' },
    },
    // 9,9,3,8 → spread 6 → 0.6. 임계값 0.5를 넘으므로 ⚡ 배지가 뜬다.
    // 시연에서 짚어야 할 카드이므로 리허설(?mock=1)에서도 실제로 보여야 한다.
    disagreement: 0.6,
    isCompleted: false,
  },
];
