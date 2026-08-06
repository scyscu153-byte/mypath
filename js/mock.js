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
