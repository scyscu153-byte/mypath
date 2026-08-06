/**
 * Mock 파이프라인
 * ─────────────────────────────────────────────────────────
 * js/pipeline.js(찬영님)의 run() 과 완전히 같은 시그니처를 가진다.
 * 실제 API를 호출하지 않고 크레딧도 쓰지 않으므로, UI만 빠르게 확인하고 싶을 때
 * URL에 ?mock=1 을 붙이면 app.js가 이 파일을 대신 쓴다.
 *
 * import * as pipeline from './pipeline.js' 와 1:1로 바꿔 끼울 수 있어야 하므로
 * run() 의 인자와 반환 모양을 pipeline.js와 반드시 맞춘다.
 */

import { MOCK_TARGET, MOCK_MATCHES, STAGE } from './types.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * pipeline.suggestTargets 의 mock.
 * app.js 가 `impl.suggestTargets(...)` 로 부르므로 여기에도 있어야
 * ?mock=1 에서 TypeError 가 나지 않는다.
 *
 * 학과에 따라 답이 달라지는 기능이라, mock 에서도 학과를 반영해
 * "게임 직군만 나온다"는 문제가 재현되지 않게 한다.
 */
export async function suggestTargets(department, { grade } = {}) {
  await delay(600);
  const dept = String(department || '').trim();
  const bank = {
    사회복지: [
      { label: '사회복지사', value: '사회복지사 신입', hint: '복지시설 채용 연계가 많음' },
      { label: '생활지원사', value: '생활지원사 신입', hint: '상시 채용이 열려 있음' },
      { label: '방과후돌봄교사', value: '방과후돌봄교사 신입', hint: '아동돌봄기관 채용' },
      { label: '사회복지행정', value: '사회복지행정 신입', hint: '행정 업무 경험이 필요' },
    ],
    유아교육: [
      { label: '보육교사', value: '보육교사 신입', hint: '가장 많이 채용되는 직무' },
      { label: '유치원 교사', value: '유치원 교사 신입', hint: '학과 대표 진로' },
      { label: '시간제 보육교사', value: '시간제 보육교사 신입', hint: '근무시간이 유연한 편' },
      { label: '어린이집 담임', value: '어린이집 담임교사 신입', hint: '경력 없이 지원 가능' },
    ],
  };
  const hit = Object.keys(bank).find((k) => dept.includes(k));
  const list = hit ? bank[hit] : [
    { label: 'Unity 클라이언트', value: '중소 게임사 Unity 클라이언트 개발자 신입', hint: '보유 기술과 가장 가까움' },
    { label: '게임 QA / 테스터', value: '게임 QA 테스터 신입', hint: '진입 장벽이 가장 낮음' },
    { label: '모바일 앱 개발자', value: '신입 모바일 앱 개발자', hint: '게임에 한정하지 않을 때' },
    { label: '백엔드 개발자', value: '신입 백엔드 개발자', hint: '조금 도전적인 경로' },
  ];
  return list.map((t) => ({ ...t, why: t.hint, kind: 'role', origin: 'suggested' }));
}

/**
 * @param {Object} opts
 * @param {import('./types.js').Profile} opts.profile
 * @param {string} opts.target  목표 (기업명 · 직군 · 분야)
 * @param {string} [opts.jobPostingUrl]  실제 채용공고 URL (선택 — mock에서는 표시만 하고 검색엔 안 씀)
 * @param {(e: import('./types.js').StageEvent) => void} [opts.onStage]
 */
export async function run({ profile, target, jobPostingUrl, onStage = () => {} }) {
  const emit = (stage, status, data, message) => onStage({ stage, status, data, message });

  emit(STAGE.REQUIRED_SKILLS, 'start');
  await delay(900);
  // jobPostingUrl을 넣었으면 mock에서도 그 링크가 근거로 반영된 것처럼 보여준다 (화면 확인용).
  const requiredSkills = jobPostingUrl
    ? MOCK_TARGET.requiredSkills.map((s) => ({ ...s, sourceUrl: jobPostingUrl }))
    : MOCK_TARGET.requiredSkills;
  emit(STAGE.REQUIRED_SKILLS, 'done', requiredSkills);

  emit(STAGE.GAP_ANALYSIS, 'start');
  await delay(500);
  const gapSkills = MOCK_TARGET.gapSkills;
  emit(STAGE.GAP_ANALYSIS, 'done', gapSkills);

  emit(STAGE.PROGRAM_SEARCH, 'start');
  await delay(900);
  // pipeline.js 는 이 단계에서 data 를 함께 보낸다. 모양을 맞춘다.
  emit(STAGE.PROGRAM_SEARCH, 'done', {
    matches: MOCK_MATCHES,
    removedSources: ['https://example.mju.ac.kr/dropped'],
    droppedForSource: 1,
    supplementedCount: 1,
    collectedAt: '2026-08-06',
  });

  emit(STAGE.PERSONA_REVIEW, 'start');
  await delay(700);
  // origin / reviewedBy / failedPersonas 도 실제 파이프라인과 똑같이 채운다.
  // 이게 없으면 mock 으로 리허설한 화면과 본 화면이 달라진다.
  // P0-1/P0-2 배지를 mock에서도 눈으로 볼 수 있게, 카드마다 다른 상태를 섞어 넣는다.
  const AVAIL_SAMPLES = ['open', 'upcoming', 'unknown', 'ongoing'];
  const SOURCE_SAMPLES = ['verified', 'unverified', null];

  const matches = MOCK_MATCHES.map((m, i) => ({
    ...m,
    isCompleted: false,
    origin: m.origin || (i === MOCK_MATCHES.length - 1 ? 'collected' : 'search'),
    reviewedBy: Object.values(m.personaScores || {})
      .filter((v) => Number.isFinite(v?.score)).length,
    failedPersonas: [],
    availability: m.availability || AVAIL_SAMPLES[i % AVAIL_SAMPLES.length],
    dateConfidence: m.dateConfidence || 'estimated',
    applicationStartAt: m.applicationStartAt ?? (i === 0 ? '2026-08-07' : null),
    applicationEndAt: m.applicationEndAt ?? (i === 0 ? '2026-08-20' : null),
    eventStartAt: m.eventStartAt ?? null,
    eventEndAt: m.eventEndAt ?? null,
    sourceStatus: m.sourceStatus === undefined ? SOURCE_SAMPLES[i % SOURCE_SAMPLES.length] : m.sourceStatus,
    sourceCheckedAt: m.sourceCheckedAt || '2026-08-06T21:00:00+09:00',
    sourceError: m.sourceError || null,
  }));
  emit(STAGE.PERSONA_REVIEW, 'done', matches);

  // ★ 반환 모양을 pipeline.js 와 정확히 맞춘다.
  //   dev-test.html 이 result.supplement / result.review 를 읽으므로
  //   빠져 있으면 mock 모드에서만 TypeError 가 난다.
  return {
    target,
    requiredSkills,
    gapSkills,
    matches,
    filtered: {
      removedSources: ['https://example.mju.ac.kr/dropped'],
      droppedForSource: 1,
      droppedForSchedule: 1,
      droppedForBrokenLink: 1,
    },
    supplement: { count: 1, collectedAt: '2026-08-06' },
    review: { personaCount: 4, failed: [] },
  };
}
