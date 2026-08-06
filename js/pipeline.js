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
import { findFallback, FALLBACK_COLLECTED_AT } from './fallback.js';

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

/**
 * 오늘 날짜를 프롬프트에 박아 넣는다.
 * "최근 것을 우선해라"만으로는 신청·행사 기간이 이미 끝난 게 명백한 항목도 섞여 나왔다
 * (사용자 실측에서 발견). 기준 날짜를 주면 모델이 스스로 종료 여부를 판단할 수 있다.
 */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ─────────────────────────────────────────────
//  P0-2. 모집 상태 판정
//
//  ★ 설계 원칙 1("자격을 판정하지 않는다")과 충돌하지 않는다.
//
//    자격 판정  = "너는 신청할 수 있다"      → 학칙을 모르므로 하지 않는다
//    모집 판정  = "이건 이미 끝난 공고다"     → 날짜는 확인 가능하므로 한다
//
//    즉 "열려 있다"고 단정하지 않는다. ★끝난 것이 명백한 것만★ 뺀다.
//    확인이 안 되면 unknown 으로 두고 "원문에서 확인하세요"로 넘긴다.
//    끝난 공고를 보여주는 것이야말로 학생을 헛걸음시키는 일이다.
// ─────────────────────────────────────────────

/** 제목·요약에 이게 있으면 지나간 것으로 본다 */
const CLOSED_KEYWORDS = [
  '마감', '종료', '결과 발표', '결과발표', '수상작', '성과 공유', '성과공유',
  '후기', '완료', '지난', '수료식', '시상식', '선정 결과', '선정결과',
  '2024학년도', '2025학년도', '2024년', '2025년',
];

/** 상시 운영으로 볼 수 있는 표현 */
const ONGOING_KEYWORDS = ['상시', '연중', '수시', '재학생 누구나', '언제든'];

function parseDate(v) {
  if (!v) return null;
  const s = String(v).trim().replace(/[./]/g, '-').slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * 프로그램의 모집 상태를 판정한다.
 *
 * @param {any} p            프로그램 (postedAt · applicationEndAt · eventEndAt 등)
 * @param {Date} [today]
 * @returns {{availability:'open'|'upcoming'|'ongoing'|'unknown'|'closed',
 *            dateConfidence:'verified'|'estimated'|'unknown', reason:string}}
 */
export function judgeAvailability(p, today = new Date()) {
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const text = `${p.programTitle || ''} ${p.summary || ''}`;

  const appStart = parseDate(p.applicationStartAt);
  const appEnd = parseDate(p.applicationEndAt);
  const evStart = parseDate(p.eventStartAt);
  const evEnd = parseDate(p.eventEndAt);
  const posted = parseDate(p.postedAt);

  const hasDates = Boolean(appStart || appEnd || evStart || evEnd);

  // ── 끝난 것이 명백한 경우만 제외한다 ──
  if (appEnd && appEnd < t) {
    return { availability: 'closed', dateConfidence: 'verified', reason: `신청 마감 ${p.applicationEndAt}` };
  }
  if (evEnd && evEnd < t) {
    return { availability: 'closed', dateConfidence: 'verified', reason: `행사 종료 ${p.eventEndAt}` };
  }
  // 날짜가 없어도 제목이 결과·수상·마감을 말하면 지나간 것이다
  const closedWord = CLOSED_KEYWORDS.find((k) => text.includes(k));
  if (closedWord && !text.includes('2026학년도')) {
    return { availability: 'closed', dateConfidence: 'estimated', reason: `종료 표현 "${closedWord}"` };
  }

  // ── 진행 중 · 예정 ──
  if (appStart && appStart > t) {
    return { availability: 'upcoming', dateConfidence: 'verified', reason: `신청 시작 ${p.applicationStartAt}` };
  }
  if (appStart && appEnd && appStart <= t && appEnd >= t) {
    return { availability: 'open', dateConfidence: 'verified', reason: `신청 기간 중 (~${p.applicationEndAt})` };
  }
  if (appEnd && appEnd >= t) {
    return { availability: 'open', dateConfidence: 'verified', reason: `신청 마감 ${p.applicationEndAt}` };
  }
  if (ONGOING_KEYWORDS.some((k) => text.includes(k))) {
    return { availability: 'ongoing', dateConfidence: 'estimated', reason: '상시 운영으로 보이는 표현' };
  }
  if (evStart && evStart > t) {
    return { availability: 'upcoming', dateConfidence: 'verified', reason: `행사 시작 ${p.eventStartAt}` };
  }

  // ── 여기까지 왔으면 확인이 안 된 것이다. 단정하지 않는다. ──
  //   게시일이 오래된 것은 낮은 확신으로 '지난 것 같다'고만 표시한다.
  //   기준을 365일 → 120일(약 4개월)로 좁혔다 (개선사항.md v2 검토, 2026-08-06).
  //   ★단, 이 분기는 applicationEndAt/eventEndAt 등 명시적 날짜가 전혀 없을 때만 탄다★
  //   (위에서 이미 걸러짐) — 지금도 열려 있는 상시 프로그램이 게시만 오래됐다는 이유로
  //   잘못 제외되는 것은 이 분기가 아니라 명시적 날짜/ONGOING_KEYWORDS 로 막는다.
  if (posted) {
    const days = Math.floor((t - posted) / 86400000);
    if (days > 120) {
      return { availability: 'closed', dateConfidence: 'estimated', reason: `게시일이 ${days}일 전` };
    }
  }
  return {
    availability: 'unknown',
    dateConfidence: hasDates ? 'estimated' : 'unknown',
    reason: '일정을 확인하지 못했습니다',
  };
}

/** 기본 추천 목록에 올릴 것인가 */
export function canRecommend(p, today = new Date()) {
  const a = p.availability || judgeAvailability(p, today).availability;
  return a !== 'closed';
}

/** 정렬 우선순위 — 모집 중 > 예정 > 상시 > 미확인 */
const AVAIL_RANK = { open: 0, upcoming: 1, ongoing: 2, unknown: 3, closed: 9 };

/** 출처 검증 상태 우선순위 — 확인됨 > 미확인 > 깨짐 */
const SOURCE_RANK = { verified: 0, unverified: 1, null: 1, undefined: 1, broken: 9 };

export function sortForDisplay(list) {
  return [...list].sort((a, b) => {
    const av = (AVAIL_RANK[a.availability] ?? 3) - (AVAIL_RANK[b.availability] ?? 3);
    if (av !== 0) return av;
    const sv = (SOURCE_RANK[a.sourceStatus] ?? 1) - (SOURCE_RANK[b.sourceStatus] ?? 1);
    if (sv !== 0) return sv;
    // 같은 등급이면 최근 게시물 우선
    return String(b.postedAt || '').localeCompare(String(a.postedAt || ''));
  });
}

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

  // ① 있는 그대로 파싱해본다 (대부분 여기서 끝난다)
  try {
    return JSON.parse(s);
  } catch { /* 아래로 */ }

  // ② 첫 [ 또는 { 부터 마지막 ] 또는 } 까지 잘라서 파싱
  const start = Math.min(
    ...[s.indexOf('['), s.indexOf('{')].filter((i) => i >= 0),
  );
  const end = Math.max(s.lastIndexOf(']'), s.lastIndexOf('}'));
  if (Number.isFinite(start) && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch { /* 아래로 */ }
  }

  // ③ ★ 모델이 배열을 여러 개로 쪼개서 뱉는 경우
  //
  //    solar-pro3 는 10개 항목을 요청하면 이렇게 답한다:
  //      [{"index":1,...}]
  //      [{"index":2,...}]      ← 하나의 배열이 아니라 배열 10개
  //
  //    ②는 첫 [ 부터 마지막 ] 까지를 통째로 파싱하므로 반드시 실패한다.
  //    실제로 이것 때문에 "시장 트렌드" 평가가 통째로 비어 있었다.
  //    모델을 바꾸는 대신 파서를 고친다 — 시연 중 어떤 모델이 이래도 살아남아야 한다.
  const chunks = extractJsonChunks(s);
  if (chunks.length) {
    const merged = chunks.flatMap((c) => (Array.isArray(c) ? c : [c]));
    if (merged.length) return merged;
  }

  return fallback;
}

/**
 * 문자열에서 균형이 맞는 JSON 덩어리를 전부 찾아 파싱한다.
 * 괄호 depth 를 세되, 문자열 리터럴 안의 괄호와 이스케이프는 무시한다.
 */
function extractJsonChunks(s) {
  const out = [];
  let depth = 0, startIdx = -1, inStr = false, esc = false, opener = '';

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }

    if (c === '[' || c === '{') {
      if (depth === 0) { startIdx = i; opener = c; }
      depth++;
    } else if (c === ']' || c === '}') {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && startIdx >= 0) {
        const closer = opener === '[' ? ']' : '}';
        if (c === closer) {
          try { out.push(JSON.parse(s.slice(startIdx, i + 1))); } catch { /* 이 덩어리는 버린다 */ }
        }
        startIdx = -1;
      }
    }
  }
  return out;
}

// ─────────────────────────────────────────────
//  0단계 — 학과로 목표 후보를 제안한다
//
//  ★ 왜 필요한가
//    목표 화면의 "빠른 선택"이 게임 직군 4개로 고정되어 있었다.
//    우리 학과(AI게임소프트웨어) 기준으로 만든 것이라
//    사회복지과·유아교육과 학생에게는 쓸모가 없고,
//    첫 화면부터 "이건 게임과 전용 도구"로 읽힌다.
//
//    학과는 이미 프로필에서 받고 있다. 그걸로 만들면 된다.
//    검색이 필요 없는 일이라 가장 싼 모델(1회 약 1크레딧)로 처리한다.
// ─────────────────────────────────────────────

/**
 * @param {string} department  학과명 (예: "사회복지과")
 * @param {Object} [opts]
 * @param {number} [opts.grade]        학년 — 난이도 조절에 쓴다
 * @param {string} [opts.skillsText]   보유 기술 요약
 * @returns {Promise<Array<{label:string, value:string, hint:string, why:string}>>}
 */
export async function suggestTargets(department, { grade, skillsText } = {}) {
  const dept = String(department || '').trim();
  if (!dept) return [];

  const { text } = await callModel({
    task: TASK.SUGGEST_TARGETS,
    system: `너는 전문대 학생의 진로를 함께 찾아주는 상담자다.
학과명을 보고, 그 학과 졸업생이 실제로 가는 진로를 제시한다.

중요한 규칙:
- ★그 학과의 실제 진로만 말해라.★ IT·개발 직군을 억지로 끼워 넣지 마라.
  예: 사회복지과 → 사회복지사·생활지원사, 유아교육과 → 보육교사·유치원 교사
- 전문대 졸업 후 ★신입으로 실제 채용이 일어나는★ 직무여야 한다.
- 대기업·유명 기업 이름을 굳이 넣지 마라. 직무 중심으로 제시해라.
- 난이도를 섞어라: 진입이 쉬운 것 1개, 학과 대표 진로 1~2개, 조금 도전적인 것 1개.
${JSON_ONLY}`,
    user: `[학과] ${dept}
${grade ? `[학년] ${grade}학년` : ''}
${skillsText ? `[보유 기술] ${skillsText}` : ''}

이 학생이 목표로 삼을 만한 진로 4개를 제안해줘.

- label: 화면 버튼에 쓸 짧은 이름 (20자 이내)
- value: 검색에 쓸 구체적인 표현 ("○○ 신입" 형태)
- hint: 왜 이걸 추천하는지 한 줄 (25자 이내)

형식:
[{"label":"짧은 이름","value":"검색용 표현","hint":"한 줄 이유"}]`,
    maxTokens: 900,
  });

  const raw = parseJson(text, []);
  return (Array.isArray(raw) ? raw : [])
    .map((t) => ({
      label: String(t.label || '').trim(),
      value: String(t.value || t.label || '').trim(),
      hint: String(t.hint || '').trim(),
      why: String(t.hint || '').trim(),
      kind: 'role',
      origin: 'suggested',   // 학과 기반 제안 — 하드코딩된 데모 목표와 구분
    }))
    .filter((t) => t.label && t.value)
    .slice(0, 4);
}

// ─────────────────────────────────────────────
//  1단계 — 목표가 요구하는 역량
// ─────────────────────────────────────────────

/**
 * @param {string} target  목표 (기업명 · 직군 · 분야 무엇이든)
 * @param {string} [jobPostingUrl]  사용자가 직접 붙여넣은 실제 채용공고 URL (선택)
 * @returns {Promise<import('./types.js').RequiredSkill[]>}
 */
export async function searchRequiredSkills(target, jobPostingUrl) {
  // 사용자가 실제 채용공고 링크를 넣었다면, 일반 검색 대신 그 공고를 직접 근거로 쓴다.
  // "왜 출처 없는 자료를 쓰는가"라는 피드백에 대한 가장 직접적인 답 — 사용자가 준 원문을 그대로 인용한다.
  const postingHint = jobPostingUrl
    ? `\n사용자가 실제로 보고 있는 채용공고 링크를 제공했다: ${jobPostingUrl}\n이 URL에 접속해서 내용을 확인하고, 여기 명시된 요구 역량을 최우선으로 반영해라. 이 공고를 sourceUrl로 인용해라.`
    : '';

  const { text, citations } = await callModel({
    task: TASK.SEARCH_REQUIRED_SKILLS,
    system: `너는 채용 시장을 조사하는 도우미다.
실제 채용공고와 기업 채용 페이지를 검색해서 요구 역량을 추출한다.
각 역량마다 근거가 된 출처 URL을 반드시 붙인다.
출처를 확인할 수 없는 역량은 답에서 빼라. "출처 없음"으로 채우지 마라.
추측하지 말고 검색으로 확인된 것만 답해라.
${JSON_ONLY}`,
    user: `"${target}"의 신입 채용에서 공통적으로 요구하는 역량을 찾아줘.${postingHint}

- 5~8개를 뽑되, ★그 직무에서 실제로 요구하는 형태★로 적어라.
  개발 직군이면 기술 스택·도구, 자격이 필요한 직군이면 자격증·면허,
  대인 서비스 직군이면 실습 경험·응대 역량처럼 직무에 맞는 것을 적어라.
  ★IT 기술을 억지로 끼워 넣지 마라.★
- 추상적인 것("성실함", "열정") 말고 구체적인 것으로
- 각 항목에 왜 필요한지 한 줄 근거와, 그 근거가 된 실제 채용공고/기업 페이지 출처 URL

형식:
[{"name":"역량명","reason":"왜 필요한지 한 줄","sourceUrl":"출처"}]`,
    maxTokens: 1500,
  });

  const raw = parseJson(text, []);
  const list = Array.isArray(raw) ? raw : [];

  // 출처가 없는 항목은 citations 에서 보충한다 (인덱스가 안 맞을 수 있어 citations[0] 도 최후 수단으로 둔다).
  // 그래도 citations 자체가 아예 없으면(= 검색이 근거를 하나도 못 찾음) 그 항목은 뺀다.
  return list
    .map((s, i) => ({
      name: String(s.name || '').trim(),
      reason: String(s.reason || '').trim(),
      sourceUrl: s.sourceUrl || citations[i] || citations[0] || '',
    }))
    .filter((s) => s.name && s.sourceUrl);
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
  const today = todayISO();

  const { text, citations } = await callModel({
    task: TASK.SEARCH_PROGRAMS,
    system: `너는 명지전문대학의 교내 프로그램을 찾아주는 도우미다.
오늘은 ${today}이다. 신청 기간이나 진행 기간이 이미 끝난 것이 명백한 프로그램은 제외해라.
모집 전이거나 진행 중이거나 상시 모집이면 포함해라.

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
    user: `아래 역량을 기를 수 있는 명지전문대학 교내 프로그램을 찾아줘. 오늘 날짜는 ${today}이다.

[부족한 역량]
${gapList}

- 역량 하나당 1~2개씩, 전체 4~8개
- 비교과 프로그램, 특강, 자격증 과정, 현장실습, 경진대회 등 무엇이든 좋다
- 각 항목에 반드시 출처 URL을 붙여라. 출처가 없으면 그 항목을 빼라.

★ 반드시 "재학생이 신청해서 참여하는 활동"이어야 한다.
   다음은 프로그램이 아니므로 제외해라 —
   학과·전공·트랙 소개, 교육과정 안내, 입시·모집요강, 학칙·규정,
   시설 안내, 조직도, 인사말, 연혁, 채용공고(교직원), 졸업요건 안내.
   판별 기준: "신청" 또는 "모집"이라는 행위가 있는가? 없으면 빼라.

★ www.mjc.ac.kr 에만 몰리지 않게 해라.
   특히 mpu.mjc.ac.kr(SMART CARE 비교과)와 sanhak.mjc.ac.kr(현장실습·캡스톤)을
   반드시 각각 한 번 이상 확인하고, 거기 해당하는 것이 있으면 포함해라.
   서로 다른 서브도메인에서 최소 2곳 이상 나오는 것이 정상이다.

★ 오래된 것보다 최근 것을 우선해라. 게시일을 확인할 수 있으면 반드시 postedAt 에 적어라.
   확인할 수 없으면 지어내지 말고 null 로 둬라.

★ 신청 기간과 행사 기간을 공지에서 확인할 수 있으면 적어라 (YYYY-MM-DD).
   ★확인되지 않으면 반드시 null 로 둬라. 추측한 날짜를 적으면 학생이 헛걸음한다.★
   "결과 발표", "수상작", "수료식" 같은 이미 끝난 행사 공지는 아예 제외해라.

형식:
[{"gapSkill":"어떤 역량을 메우는지","programTitle":"프로그램명","summary":"한 줄 설명","sourceUrl":"출처","postedAt":"게시일 또는 null","department":"운영 부서","applicationStartAt":null,"applicationEndAt":null,"eventStartAt":null,"eventEndAt":null}]`,
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
      applicationStartAt: p.applicationStartAt || null,
      applicationEndAt: p.applicationEndAt || null,
      eventStartAt: p.eventStartAt || null,
      eventEndAt: p.eventEndAt || null,
    }))
    .filter((p) => p.programTitle && isAllowedSource(p.sourceUrl))
    .map((p) => ({
      ...p,
      sourceDomain: safeHost(p.sourceUrl),
    }));

  const droppedForSource = list.length - matches.length;

  // ★ 검색이 못 메운 갭을 수집 데이터로 보충한다.
  //
  //   실측에서 갭 5개 중 1개(Unity)만 프로그램이 나오고
  //   Git·UI·네트워크 갭은 빈손으로 끝났다.
  //   실시간 검색은 "지금 열려 있는 것"에 강하지만 놓치는 게 많다.
  //   그래서 직접 조사해 URL까지 확인한 143건에서 마저 채운다.
  //
  //   출처는 똑같이 표시하고, 어디서 온 항목인지(origin)도 숨기지 않는다.
  const covered = new Set(matches.map((m) => m.gapSkill));
  const seenTitles = new Set(matches.map((m) => m.programTitle));
  const supplemented = [];

  for (const g of gaps) {
    if (covered.has(g.name)) continue;
    for (const p of findFallback([g.name], 2)) {
      if (seenTitles.has(p.programTitle)) continue;
      seenTitles.add(p.programTitle);
      supplemented.push({
        gapSkill: g.name,
        programTitle: p.programTitle,
        summary: p.summary,
        sourceUrl: p.sourceUrl,
        sourceDomain: p.sourceDomain,
        postedAt: p.postedAt,
        department: p.department,
        origin: 'collected', // 수집 데이터에서 왔다
      });
    }
  }

  const all = [
    ...matches.map((m) => ({ ...m, origin: 'search' })), // 실시간 검색에서 왔다
    ...supplemented,
  ];

  // ── P0-2. 모집 상태 판정 ──────────────────────
  //   검색 결과와 수집 데이터에 ★똑같이★ 적용한다.
  //   수집 143건에는 2024년 자료가 섞여 있어, 여기서 걸러지지 않으면
  //   "이미 끝난 프로그램"이 계속 추천된다 (사용자 실측에서 발견).
  // 위쪽 today 는 프롬프트에 넣는 문자열(todayISO)이라 이름을 달리한다
  const now = new Date();
  const judged = all.map((p) => {
    const j = judgeAvailability(p, now);
    return {
      ...p,
      applicationStartAt: p.applicationStartAt ?? null,
      applicationEndAt: p.applicationEndAt ?? null,
      eventStartAt: p.eventStartAt ?? null,
      eventEndAt: p.eventEndAt ?? null,
      availability: j.availability,
      dateConfidence: j.dateConfidence,
      availabilityReason: j.reason,
    };
  });

  const recommendable = judged.filter((p) => canRecommend(p, now));
  const droppedForSchedule = judged.length - recommendable.length;

  // ── P0-1. 출처 URL 실검증 ─────────────────────
  //   형식만 mjc.ac.kr 인 URL 과 실제로 열리는 페이지는 다르다.
  //   브라우저는 CORS 때문에 확인할 수 없으므로 서버 함수에 맡긴다.
  //   ★실패해도 추천을 막지 않는다★ — 검증은 부가 정보이지 전제 조건이 아니다.
  const verified = await attachSourceStatus(recommendable);

  // broken 만 제외한다. unverified 는 "확인 필요"로 남긴다.
  const visible = verified.filter((p) => p.sourceStatus !== 'broken');
  const droppedForBrokenLink = verified.length - visible.length;

  return {
    matches: sortForDisplay(visible),
    removedSources: removed,
    droppedForSource,
    droppedForSchedule,
    droppedForBrokenLink,
    supplementedCount: supplemented.filter(
      (s) => visible.some((v) => v.programTitle === s.programTitle),
    ).length,
    collectedAt: FALLBACK_COLLECTED_AT,
  };
}

/**
 * 출처 URL 을 서버 함수로 실제로 열어 보고 상태를 붙인다.
 *
 * 서버가 없거나(정적 호스팅) 실패해도 화면은 그대로 동작해야 한다.
 * 그래서 실패 시 sourceStatus 를 null 로 둔다 — UI 는 null 이면 배지를 그리지 않는다.
 */
async function attachSourceStatus(list) {
  if (!list.length) return list;

  const withNull = (err) => list.map((p) => ({
    ...p, sourceStatus: null, sourceCheckedAt: null, sourceError: err,
  }));

  try {
    const res = await fetch('/api/verify-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: list.slice(0, 20).map((p) => ({ url: p.sourceUrl, title: p.programTitle })),
      }),
    });
    if (!res.ok) return withNull(`검증 서버 응답 ${res.status}`);

    const data = await res.json();
    const byUrl = new Map((data.results || []).map((r) => [r.url, r]));

    return list.map((p) => {
      const r = byUrl.get(p.sourceUrl);
      return {
        ...p,
        sourceStatus: r?.status ?? null,
        sourceCheckedAt: r ? data.checkedAt : null,
        sourceError: r?.error ?? null,
      };
    });
  } catch (e) {
    console.warn('[출처 검증 건너뜀]', e?.message || e);
    return withNull(null);
  }
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

comment 를 쓸 때는 (점수 자체는 절대 봐주지 말고, comment 어조만):
- "부족하다", "미흡하다", "적합하지 않다" 같은 단정적 지적 대신,
  이 프로그램에 참여하면 얻을 수 있는 경험·성장을 중심으로 설명해라.
- 낮은 점수를 줄 때도 "왜 지금 이 학생에게는 우선순위가 낮은지"를
  담백하게 설명하되, 학생을 평가하는 말투가 아니라 프로그램을 소개하는 말투를 써라.
- 점수를 후하게 주라는 뜻이 아니다. 점수는 계속 정직하고 갈릴 수 있게 유지해라
  (네 관점에서 안 맞으면 낮은 점수를 그대로 줘라). 문장 톤만 부드럽게 해라.
${JSON_ONLY}`,
          user: `[학생] ${profile.grade}학년 ${profile.department}
[목표] ${target}

[평가할 프로그램]
${listText}

각 프로그램을 0~10점으로 평가하고 한 줄 이유를 붙여줘.

형식:
[{"index":1,"score":8,"comment":"한 줄 평가"}]`,
          // ★ 900 이었을 때 한 모델의 출력이 문장 중간에 잘려 평가가 통째로 날아갔다.
          //   모델에 따라 답을 쓰기 전에 속으로 생각하는 토큰이 있고, 그것도 이 한도에 포함된다.
          //   프로그램 10개 기준 claude-sonnet-5 가 808토큰을 썼다. 항목이 늘 것을 감안해 여유를 둔다.
          maxTokens: 2500,
        });
        return { key: p.key, verdicts: parseJson(text, []) };
      } catch (e) {
        // 한 모델이 실패해도 나머지 관점은 살린다.
        // 다만 ★조용히 넘어가지는 않는다★ — 실패를 삼키면 "4개가 평가했다"고
        // 표시해놓고 실제로는 3개만 평가한 상태가 된다.
        console.warn(`[페르소나 실패] ${p.key} (${PERSONA_MODEL[p.key]}):`, e?.message || e);
        return { key: p.key, verdicts: [], error: String(e?.message || e) };
      }
    }),
  );

  const failedPersonas = results.filter((r) => r.error).map((r) => r.key);

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
      origin: m.origin || 'search', // 실시간 검색 / 수집 데이터 — 화면에 구분해 표시한다

      // P0-1 출처 검증 결과 (null = 검증하지 못함 → UI 는 배지를 그리지 않는다)
      sourceStatus: m.sourceStatus ?? null,
      sourceCheckedAt: m.sourceCheckedAt ?? null,
      sourceError: m.sourceError ?? null,

      // P0-2 모집 상태
      availability: m.availability ?? 'unknown',
      dateConfidence: m.dateConfidence ?? 'unknown',
      availabilityReason: m.availabilityReason ?? null,
      applicationStartAt: m.applicationStartAt ?? null,
      applicationEndAt: m.applicationEndAt ?? null,
      eventStartAt: m.eventStartAt ?? null,
      eventEndAt: m.eventEndAt ?? null,

      deadline: null, // 마감일은 판정하지 않는다 — 원문 확인 안내로 대체
      personaScores,
      // 몇 명이 실제로 평가했는지 숨기지 않는다.
      // 화면에 "4개 AI가 평가했습니다"라고 쓰려면 이 값이 4여야 한다.
      reviewedBy: scores.length,
      failedPersonas,
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
 * @param {string} [opts.jobPostingUrl]  사용자가 직접 붙여넣은 실제 채용공고 URL (선택)
 * @param {(e: import('./types.js').StageEvent) => void} [opts.onStage]  진행 콜백
 */
export async function run({ profile, target, jobPostingUrl, onStage = () => {} }) {
  const emit = (stage, status, data, message) => onStage({ stage, status, data, message });

  /**
   * 한 단계를 실행하되, 실패하면 ★그 단계에 error 를 찍고★ 다시 던진다.
   *
   * 이게 없으면 2~4단계가 실패했을 때 화면이 스피너에서 영원히 멈춘다.
   * 진행 화면은 stage 이름으로 항목을 찾기 때문에, 단계 이름 없이 던진 에러는
   * 어디에도 표시되지 않는다. 시연 중에 이러면 "멈췄네요"로 끝난다.
   */
  const step = async (stage, fn, hint) => {
    emit(stage, 'start');
    try {
      return await fn();
    } catch (e) {
      emit(stage, 'error', null, hint || e?.message || String(e));
      throw e;
    }
  };

  // 1단계
  const requiredSkills = await step(STAGE.REQUIRED_SKILLS,
    () => searchRequiredSkills(target, jobPostingUrl),
    '요구 역량을 찾는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  if (!requiredSkills.length) {
    emit(STAGE.REQUIRED_SKILLS, 'error', null,
      '요구 역량을 찾지 못했습니다. 목표를 더 구체적으로 적어보세요 (예: "게임 클라이언트 개발자")');
    throw new Error('요구 역량 없음');
  }
  emit(STAGE.REQUIRED_SKILLS, 'done', requiredSkills);

  // 2단계
  const gapSkills = await step(STAGE.GAP_ANALYSIS,
    () => analyzeGap(requiredSkills, profile),
    '갭 분석 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  emit(STAGE.GAP_ANALYSIS, 'done', gapSkills);

  // 3단계
  const {
    matches, removedSources, droppedForSource, supplementedCount, collectedAt,
    droppedForSchedule, droppedForBrokenLink,
  } = await step(STAGE.PROGRAM_SEARCH,
    () => searchPrograms(gapSkills),
    '교내 프로그램을 찾는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  emit(STAGE.PROGRAM_SEARCH, 'done', {
    matches, removedSources, droppedForSource, supplementedCount, collectedAt,
    droppedForSchedule, droppedForBrokenLink,
  });

  // 4단계
  const reviewed = await step(STAGE.PERSONA_REVIEW,
    () => reviewByPersonas(matches, profile, target),
    '평가 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  emit(STAGE.PERSONA_REVIEW, 'done', reviewed);

  return {
    target,
    requiredSkills,
    gapSkills,
    matches: reviewed,
    // 무엇을 왜 걸러냈는지 — 화면에 근거로 보여줄 수 있다
    filtered: {
      removedSources,
      droppedForSource,      // mjc.ac.kr 출처가 아니라서 제외
      droppedForSchedule,    // 이미 끝난 것이 명백해서 제외 (P0-2)
      droppedForBrokenLink,  // 원문이 실제로 열리지 않아서 제외 (P0-1)
    },
    // 실시간 검색이 못 메운 갭을 수집 데이터로 몇 건 보충했는지
    supplement: { count: supplementedCount, collectedAt },
    // 4명 중 실제로 몇 명이 평가했는지 (실패한 모델이 있으면 여기 남는다)
    review: {
      personaCount: PERSONAS.length,
      failed: reviewed[0]?.failedPersonas || [],
    },
  };
}
