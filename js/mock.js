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
 * @param {(e: import('./types.js').StageEvent) => void} [opts.onStage]
 */
export async function run({ profile, target, onStage = () => {} }) {
  const emit = (stage, status, data, message) => onStage({ stage, status, data, message });

  emit(STAGE.REQUIRED_SKILLS, 'start');
  await delay(900);
  const requiredSkills = MOCK_TARGET.requiredSkills;
  emit(STAGE.REQUIRED_SKILLS, 'done', requiredSkills);

  emit(STAGE.GAP_ANALYSIS, 'start');
  await delay(500);
  const gapSkills = MOCK_TARGET.gapSkills;
  emit(STAGE.GAP_ANALYSIS, 'done', gapSkills);

  emit(STAGE.PROGRAM_SEARCH, 'start');
  await delay(900);
  emit(STAGE.PROGRAM_SEARCH, 'done');

  emit(STAGE.PERSONA_REVIEW, 'start');
  await delay(700);
  const matches = MOCK_MATCHES.map((m) => ({ ...m, isCompleted: false }));
  emit(STAGE.PERSONA_REVIEW, 'done', matches);

  return { target, requiredSkills, gapSkills, matches, filtered: { removedSources: [], droppedForSource: 0 } };
}
