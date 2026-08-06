/**
 * 파이프라인 — 목표에서 추천까지
 * ─────────────────────────────────────────────────────────
 *
 *   1단계  요구 역량 검색   목표가 요구하는 역량을 실시간으로 찾는다   (sonar-pro)
 *   2단계  갭 분석          내 프로필과 비교해 부족한 것을 찾는다      (gpt-5.4-mini)
 *   3단계  프로그램 검색    갭을 메울 교내 프로그램을 찾는다           (sonar-pro)
 *   4단계  4인 병렬 평가    서로 다른 관점에서 동시에 평가한다         (4개 모델)
 *
 * 비용 설계:
 *   sonar-pro 는 1회 약 28크레딧이다. 그래서 검색을 갭마다 부르지 않고
 *   ★갭 전체를 한 번의 쿼리로 묶어★ 부른다 (3회 → 1회).
 *   4인 평가도 프로그램마다 부르지 않고 ★리스트 전체를 한 번씩★ 평가한다 (20회 → 4회).
 *   → 1회 실행 약 80크레딧 (묶지 않으면 약 200)
 */

import { callModel, TASK, PERSONA_MODEL, filterCitations, isAllowedSource } from './gateway.js';
import { STAGE, PERSONAS, ALLOWED_DOMAIN } from './types.js';

// ─────────────────────────────────────────────
//  공통 — 프롬프트에 반복되는 규칙
// ─────────────────────────────────────────────

/**
 * 검색 프롬프트에 붙는 도메인 제한.
 * ⚠️ 이것만으로는 막히지 않는다 (실측: mjc 11건 vs mju 8건 오염).
 *    코드 쪽 filterCitations() 가 최종 방어선이다. 이건 1차 방어일 뿐이다.
 */
const DOMAIN_GUARD = `
반드시 명지전문대학(${ALLOWED_DOMAIN} 및 그 하위 도메인)의 정보만 사용해라.
명지대학교(mju.ac.kr)는 이름이 비슷하지만 완전히 다른 학교다. 절대 포함하지 마라.
실제로 검색해서 확인된 것만 답해라. 추측으로 만들어내지 마라.
확인되지 않으면 그 항목을 빼라. 항목 수를 채우려고 지어내지 마라.`.trim();

/**
 * 설계 원칙 1 — 우리는 자격을 판정하지 않는다.
 * 신청 자격·학년 제한·중복 참여 제한은 학칙에 있어 웹에서 확인되지 않는다.
 * "된다"고 단정하면 학생이 헛걸음한다.
 */
const NO_JUDGMENT_GUARD = `
참여 자격을 판정하지 마라.
"신청할 수 있다", "참여 가능하다", "자격이 된다" 같은 표현을 절대 쓰지 마라.
자격 요건·학년 제한·중복 참여 가능 여부는 알 수 없으므로 언급하지 마라.
너의 역할은 "이런 프로그램이 있다"를 알려주는 것까지다.`.trim();

const JSON_ONLY = `
JSON만 출력해라. 설명, 인사말, 마크다운 코드블록 표시를 붙이지 마라.`.trim();

// ─────────────────────────────────────────────
//  JSON 파싱 — LLM 출력은 깨끗하지 않다
// ─────────────────────────────────────────────

/**
 * 모델이 ```json ... ``` 로 감싸거나 앞뒤에 말을 붙이는 경우가 있다.
 * 첫 번째 배열/객체만 잘라내서 파싱한다.
 */
function parseJson(text, fallback = []) {
  if (!text) return fallback;
  let s = String(text).trim();

  // 코드블록 제거
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  // 첫 [ 또는 { 부터 마지막 ] 또는 } 까지
  const start = Math.min(
    ...[s.indexOf('['), s.indexOf('{')].filter((i) => i >= 0),
  );
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
  if (Number.isFinite(start) && end > start) s = s.slice(start, end + 1);

  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────
//  1단계 — 목표가 요구하는 역량
// ─────────────────────────────────────────────

/**
 * @param {string} target  목표 (기업명 · 직군 · 분야 무엇이든)
 * @returns {Promise<import('./types.js').RequiredSkill[]>}
 */
export async function searchRequiredSkills(target) {
  const { text, citations } = await callModel({
    task: TASK.SEARCH_REQUIRED_SKILLS,
    system: `너는 채용 시장을 조사하는 도우미다.
실제 채용공고와 기업 채용 페이지를 검색해서 요구 역량을 추출한다.
각 역량마다 근거가 된 출처 URL을 반드시 붙인다.
추측하지 말고 검색으로 확인된 것만 답해라.
${JSON_ONLY}`,
    user: `"${target}"의 신입 채용에서 공통적으로 요구하는 역량을 찾아줘.

- 기술 스택, 도구, 경험 위주로 5~8개
- 추상적인 것("성실함", "열정") 말고 구체적인 것으로
- 각 항목에 왜 필요한지 한 줄 근거와 출처 URL

형식:
[{"name":"역량명","reason":"왜 필요한지 한 줄","sourceUrl":"출처"}]`,
    maxTokens: 1500,
  });

  const raw = parseJson(text, []);
  const list = Array.isArray(raw) ? raw : [];

  // 출처가 없는 항목은 citations 에서 보충한다
  return list
    .map((s, i) => ({
      name: String(s.name || '').trim(),
      reason: String(s.reason || '').trim(),
      sourceUrl: s.sourceUrl || citations[i] || citations[0] || '',
    }))
    .filter((s) => s.name);
}

// ─────────────────────────────────────────────
//  2단계 — 갭 분석
// ─────────────────────────────────────────────

/**
 * @param {import('./types.js').RequiredSkill[]} required
 * @param {import('./types.js').Profile} profile
 * @returns {Promise<import('./types.js').GapSkill[]>}
 */
export async function analyzeGap(required, profile) {
  const skills = (profile.skills || [])
    .map((s) => (typeof s === 'string' ? s : `${s.name}(${s.level || '보유'})`))
    .join(', ') || '없음';
  const certs = (profile.certificates || []).join(', ') || '없음';
  const done = (profile.completedActivities || [])
    .map((a) => a.programTitle).join(', ') || '없음';

  const { text } = await callModel({
    task: TASK.ANALYZE_GAP,
    system: `너는 진로 상담 도우미다.
목표가 요구하는 역량과 학생의 현재 상태를 비교해 부족한 부분을 찾는다.

판단 기준:
- "학습 중"이나 "미숙"은 부분 보유로 본다. 완전히 없는 것과 구분해라.
- 목표와 관련이 없는 자격증·기술은 갭 해소에 반영하지 마라.
  (다만 그것을 폄하하지 마라. 단지 이 목표에는 직접 도움이 안 될 뿐이다.)
- 학년을 고려해라. 1학년에게 3~4년치 경력을 요구하지 마라.
${JSON_ONLY}`,
    user: `[목표가 요구하는 역량]
${required.map((r) => `- ${r.name}: ${r.reason}`).join('\n')}

[학생의 현재 상태]
- 학년: ${profile.grade}학년${profile.semester ? ` ${profile.semester}학기` : ''}
- 학과: ${profile.department}
- 보유 자격증: ${certs}
- 보유 기술: ${skills}
- 이행한 프로그램: ${done}

부족한 역량을 우선순위와 함께 정리해줘. 3~5개.

형식:
[{"name":"역량명","reason":"왜 부족하다고 판단했는지","priority":"high|medium|low"}]`,
    maxTokens: 1200,
  });

  const raw = parseJson(text, []);
  return (Array.isArray(raw) ? raw : [])
    .map((g) => ({
      name: String(g.name || '').trim(),
      reason: String(g.reason || '').trim(),
      priority: ['high', 'medium', 'low'].includes(g.priority) ? g.priority : 'medium',
    }))
    .filter((g) => g.name);
}

// ─────────────────────────────────────────────
//  3단계 — 교내 프로그램 검색
//
//  ★ 갭마다 부르지 않는다. 전체를 한 번에 묶어서 부른다.
//    sonar-pro 1회가 약 28크레딧이므로 3회 → 1회로 줄이면 56크레딧을 아낀다.
// ─────────────────────────────────────────────

/**
 * @param {import('./types.js').GapSkill[]} gaps
 * @returns {Promise<{matches:Array, removedSources:string[]}>}
 */
export async function searchPrograms(gaps) {
  const gapList = gaps.map((g) => `- ${g.name} (${g.reason})`).join('\n');

  const { text, citations } = await callModel({
    task: TASK.SEARCH_PROGRAMS,
    system: `너는 명지전문대학의 교내 프로그램을 찾아주는 도우미다.

${DOMAIN_GUARD}

${NO_JUDGMENT_GUARD}

찾아볼 곳 (모두 ${ALLOWED_DOMAIN} 하위 — 직접 조사해 확인한 목록이다):
- www.mjc.ac.kr    대학 공지·학사공지. 비교과·자격증·장학 공지가 가장 많다
- cls.mjc.ac.kr    학과 공지판. 전교 공지를 미러링해 제목이 온전히 실린다
- mpu.mjc.ac.kr    SMART CARE 비교과 프로그램
- sanhak.mjc.ac.kr 산학협력·현장실습(WE-GO, Co-op)·캡스톤디자인
- rise.mjc.ac.kr   RISE사업단. 다만 상당수가 성인학습자 대상이다
- inter.mjc.ac.kr  국제교류·글로벌 현장학습
- mrcc.mjc.ac.kr   지역협력·리빙랩
- edu.mjc.ac.kr    평생교육원
${JSON_ONLY}`,
    user: `아래 역량을 기를 수 있는 명지전문대학 교내 프로그램을 찾아줘.

[부족한 역량]
${gapList}

- 역량 하나당 1~2개씩, 전체 4~8개
- 비교과 프로그램, 특강, 자격증 과정, 현장실습, 경진대회 등 무엇이든 좋다
- 각 항목에 반드시 출처 URL을 붙여라. 출처가 없으면 그 항목을 빼라.

형식:
[{"gapSkill":"어떤 역량을 메우는지","programTitle":"프로그램명","summary":"한 줄 설명","sourceUrl":"출처","postedAt":"게시일 또는 null","department":"운영 부서"}]`,
    maxTokens: 2500,
  });

  const raw = parseJson(text, []);
  const list = Array.isArray(raw) ? raw : [];
  const { removed } = filterCitations(citations);

  // ★ 최종 방어선 — 출처가 mjc.ac.kr 이 아니면 버린다.
  //   프롬프트로 지시해도 명지대(mju) 정보가 섞이기 때문이다.
  const matches = list
    .map((p) => ({
      gapSkill: String(p.gapSkill || '').trim(),
      programTitle: String(p.programTitle || '').trim(),
      summary: String(p.summary || '').trim(),
      sourceUrl: String(p.sourceUrl || '').trim(),
      postedAt: p.postedAt || null,
      department: p.department || null,
    }))
    .filter((p) => p.programTitle && isAllowedSource(p.sourceUrl))
    .map((p) => ({
      ...p,
      sourceDomain: safeHost(p.sourceUrl),
    }));

  const droppedForSource = list.length - matches.length;
  return { matches, removedSources: removed, droppedForSource };
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

// ─────────────────────────────────────────────
//  4단계 — 4인 병렬 평가
//
//  ★ 프로그램마다 부르지 않는다. 리스트 전체를 각 페르소나가 한 번씩 본다.
//    프로그램 5개 × 4모델 = 20회 → 4회
//
//  ⚠️ 4개가 같은 답을 하면 "기믹"으로 읽힌다.
//     그래서 각 페르소나에 ★서로 다른 벤더의 모델★을 배정하고,
//     의견이 갈리는 지점(disagreement)을 계산해 화면에서 강조한다.
// ─────────────────────────────────────────────

/**
 * @param {Array} matches  3단계 결과
 * @param {import('./types.js').Profile} profile
 * @param {string} target
 * @returns {Promise<import('./types.js').ProgramMatch[]>}
 */
export async function reviewByPersonas(matches, profile, target) {
  if (!matches.length) return [];

  const listText = matches
    .map((m, i) => `${i + 1}. ${m.programTitle} — ${m.summary} (메우는 역량: ${m.gapSkill})`)
    .join('\n');

  // 4개 페르소나를 동시에 호출한다
  const results = await Promise.all(
    PERSONAS.map(async (p) => {
      try {
        const { text } = await callModel({
          model: PERSONA_MODEL[p.key],
          system: `너는 "${p.label}"(${p.sub}) 관점에서 평가하는 심사자다.
너의 판단 기준은 오직 하나다 — ${p.question}

다른 관점(비용, 학점, 시장성 등)은 네 담당이 아니다. 네 관점에서만 평가해라.
솔직하게 평가해라. 낮은 점수를 주는 것도 정상이다.
모두에게 높은 점수를 주면 평가의 의미가 없다.
${JSON_ONLY}`,
          user: `[학생] ${profile.grade}학년 ${profile.department}
[목표] ${target}

[평가할 프로그램]
${listText}

각 프로그램을 0~10점으로 평가하고 한 줄 이유를 붙여줘.

형식:
[{"index":1,"score":8,"comment":"한 줄 평가"}]`,
          maxTokens: 900,
        });
        return { key: p.key, verdicts: parseJson(text, []) };
      } catch {
        // 한 모델이 실패해도 나머지 관점은 살린다
        return { key: p.key, verdicts: [] };
      }
    }),
  );

  // 페르소나별 결과를 프로그램별로 합친다
  return matches.map((m, i) => {
    /** @type {any} */
    const personaScores = {};
    const scores = [];

    for (const { key, verdicts } of results) {
      const v = (Array.isArray(verdicts) ? verdicts : [])
        .find((x) => Number(x.index) === i + 1);
      const score = clamp(Number(v?.score));
      personaScores[key] = {
        score: Number.isFinite(score) ? score : null,
        comment: String(v?.comment || '평가 없음').trim(),
      };
      if (Number.isFinite(score)) scores.push(score);
    }

    return {
      id: `pm-${i}`,
      gapSkill: m.gapSkill,
      programTitle: m.programTitle,
      summary: m.summary,
      sourceUrl: m.sourceUrl,
      sourceDomain: m.sourceDomain,
      postedAt: m.postedAt,
      deadline: null, // 마감일은 판정하지 않는다 — 원문 확인 안내로 대체
      personaScores,
      disagreement: disagreementOf(scores),
      isCompleted: false,
    };
  });
}

function clamp(n) {
  if (!Number.isFinite(n)) return NaN;
  return Math.max(0, Math.min(10, n));
}

/**
 * 의견이 얼마나 갈렸는지 0~1 로 계산한다.
 * 점수 폭(최대-최소)이 클수록 갈린 것이다.
 * 이 값이 큰 항목을 화면에서 강조해 "왜 4개 모델을 쓰는가"를 증명한다.
 */
function disagreementOf(scores) {
  if (scores.length < 2) return 0;
  const spread = Math.max(...scores) - Math.min(...scores);
  return Math.round((spread / 10) * 100) / 100;
}

// ─────────────────────────────────────────────
//  전체 실행
// ─────────────────────────────────────────────

/**
 * 파이프라인 전체를 순서대로 실행한다.
 *
 * @param {Object} opts
 * @param {import('./types.js').Profile} opts.profile
 * @param {string} opts.target
 * @param {(e: import('./types.js').StageEvent) => void} [opts.onStage]  진행 콜백
 */
export async function run({ profile, target, onStage = () => {} }) {
  const emit = (stage, status, data, message) => onStage({ stage, status, data, message });

  // 1단계
  emit(STAGE.REQUIRED_SKILLS, 'start');
  const requiredSkills = await searchRequiredSkills(target);
  if (!requiredSkills.length) {
    emit(STAGE.REQUIRED_SKILLS, 'error', null,
      '요구 역량을 찾지 못했습니다. 목표를 더 구체적으로 적어보세요 (예: "게임 클라이언트 개발자")');
    throw new Error('요구 역량 없음');
  }
  emit(STAGE.REQUIRED_SKILLS, 'done', requiredSkills);

  // 2단계
  emit(STAGE.GAP_ANALYSIS, 'start');
  const gapSkills = await analyzeGap(requiredSkills, profile);
  emit(STAGE.GAP_ANALYSIS, 'done', gapSkills);

  // 3단계
  emit(STAGE.PROGRAM_SEARCH, 'start');
  const { matches, removedSources, droppedForSource } = await searchPrograms(gapSkills);
  emit(STAGE.PROGRAM_SEARCH, 'done', { matches, removedSources, droppedForSource });

  // 4단계
  emit(STAGE.PERSONA_REVIEW, 'start');
  const reviewed = await reviewByPersonas(matches, profile, target);
  emit(STAGE.PERSONA_REVIEW, 'done', reviewed);

  return {
    target,
    requiredSkills,
    gapSkills,
    matches: reviewed,
    // 도메인 필터가 실제로 무엇을 걸러냈는지 — 화면에 근거로 보여줄 수 있다
    filtered: { removedSources, droppedForSource },
  };
}
