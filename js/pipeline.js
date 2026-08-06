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
import { findFallback, FALLBACK_COLLECTED_AT, isCurriculum } from './fallback.js';

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
];

/**
 * 제목·요약에 ★지난 연도 표기★가 있는가.
 *
 * ★전에는 여기에 '2024학년도'·'2025학년도'를 손으로 적어 뒀다.★
 * 그래서 2022·2023 표기는 그냥 통과했고, 요약에 "상시"가 있으면
 * 아래 ONGOING 분기까지 내려가 ★2022학년도 공지가 「상시 모집 중」으로 떴다.★
 * 실제로 보고서 대표 화면 캡처에 그 상태가 그대로 찍혀 있었다.
 *
 * 목록을 늘리는 것은 답이 아니다 — 해가 바뀔 때마다 고쳐야 하고,
 * 빠뜨린 해는 조용히 통과한다. 현재 학년도와 비교해 판정한다.
 *
 * @param {string} text  제목 + 요약
 * @param {Date}   today
 * @returns {string|null} 걸린 표기 (없으면 null)
 */
function pastYearMark(text, today) {
  const current = academicYearStart(today).getUTCFullYear();
  for (const m of String(text).matchAll(/20\d\d\s*(?:학년도|년)/g)) {
    const year = Number(m[0].slice(0, 4));
    if (year < current) return m[0];
  }
  return null;
}

/** 상시 운영으로 볼 수 있는 표현 */
const ONGOING_KEYWORDS = ['상시', '연중', '수시', '재학생 누구나', '언제든'];

/**
 * 그 날짜가 속한 학년도의 시작일(3월 1일)을 돌려준다.
 * 1~2월은 아직 전 학년도다.
 */
function academicYearStart(d) {
  const y = d.getUTCFullYear();
  const startYear = d.getUTCMonth() >= 2 ? y : y - 1;   // 0=1월 → 2=3월
  return new Date(Date.UTC(startYear, 2, 1));
}

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
/**
 * 모집 상태를 판정해 프로그램에 붙여준다.
 *
 * ★모듈 수준에 둔다.★ 전에는 searchPrograms 안의 지역 함수(`judge`)였는데,
 * 교외 활동 검색을 새로 쓰면서 그걸 부르려다 `judge is not defined` 로 죽었다.
 * 교내와 교외가 ★같은 잣대★로 판정되어야 화면에 나란히 놓인 배지를 비교할 수 있다.
 * 그러려면 정의가 한 곳에만 있어야 한다.
 *
 * @param {any} p
 * @param {Date} now
 */
export function attachAvailability(p, now = new Date()) {
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
}

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
  // ★현재 학년도 표기가 함께 있으면 종료로 보지 않는다.★
  //   「2026학년도 ○○ 결과 발표」처럼 올해 공지에 종료 낱말이 섞이는 경우가 있다.
  const thisYearMark = `${academicYearStart(t).getUTCFullYear()}학년도`;
  const closedWord = CLOSED_KEYWORDS.find((k) => text.includes(k)) || pastYearMark(text, t);

  // ★확인된 미래 날짜가 있으면 낱말로 뒤집지 않는다.★
  //
  //   이 낱말 검사는 ★날짜를 모를 때 쓰는 어림짐작★이다.
  //   그런데 이 분기가 "미래 마감이면 open" 검사보다 ★앞에★ 있어서,
  //   9월 30일이 마감인 프로그램이 요약에 「신청 마감 2026-09-30」이라고
  //   적혀 있다는 이유로 closed 가 됐다. 어림짐작이 확인된 사실을 이겼다.
  //
  //   교외 검색에서 특히 잘 터진다 — 프롬프트가 모델에게
  //   "공모전은 마감이 곧 전부다"라고 각인시켜 놔서 요약에 「마감」이 들어올
  //   확률이 높다. 3~4건만 뽑는데 두 건이 걸리면 절반이 날아가고,
  //   화면은 "찾지 못했습니다"라고 말한다 — 찾았는데 우리가 지운 것이다.
  //
  //   ★안전장치가 진짜를 죽인 다섯 번째다.★ 앞의 넷과 같은 모양이다(8.5.2).
  const hasFutureDate = (appEnd && appEnd >= t)
    || (evEnd && evEnd >= t)
    || (appStart && appStart > t);

  if (closedWord && !hasFutureDate && !text.includes(thisYearMark)) {
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
  //   기준을 365일 → 120일(약 4개월)로 좁혔다 (2026-08-06 팀 검토).
  //   ★단, 이 분기는 applicationEndAt/eventEndAt 등 명시적 날짜가 전혀 없을 때만 탄다★
  //   (위에서 이미 걸러짐) — 지금도 열려 있는 상시 프로그램이 게시만 오래됐다는 이유로
  //   잘못 제외되는 것은 이 분기가 아니라 명시적 날짜/ONGOING_KEYWORDS 로 막는다.
  //  ★ 기준: 120일 → ★현재 학년도★ (2026-08-06 실측 후 되돌림)
  //
  //    120일(4개월)로 좁혔더니 ★연중 상시 운영되는 프로그램 23건이 죽었다.★
  //      명지튜터링 · 버디업 멘토링 · 도전! 학습톡톡 · 취업/창업동아리
  //      AI Study+ · 1:1 진로코칭 · 전문기술인재장학금 · 디지털배지 · AID 역량 인증제
  //      도서관 이용자 교육 · 글로벌 어학아카데미 · 기초학습능력 진단
  //    전부 3월에 공지가 올라와 1년 내내 도는 것들이다.
  //    수집 143건 기준 추천 가능 건수가 143 → 91건(64%)으로 줄었다.
  //
  //    학년도는 3월에 시작한다. ★같은 학년도의 공지는 종료로 단정하지 않는다.★
  //    의미상으로도 맞고 심사위원에게 설명하기도 쉽다.
  if (posted) {
    const days = Math.floor((t - posted) / 86400000);
    if (posted < academicYearStart(t) && days > 120) {
      return { availability: 'closed', dateConfidence: 'estimated', reason: `지난 학년도 게시물 (${days}일 전)` };
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

/**
 * 정규 학사과정·제도·조직 판별은 ★js/fallback.js 에 한 곳만 둔다.★
 * 규칙을 두 파일에 각각 적으면 반드시 어긋난다 —
 * 이 프로젝트에서 타임아웃 숫자와 테스트 개수로 이미 두 번 겪었다.
 * 여기서는 가져다 쓰기만 한다 (import 는 파일 상단 참조).
 */

/**
 * 정규 교육과정 항목을 최대 `max`개만 남긴다.
 * 비교과 프로그램을 밀어내지 않게 하는 것이 목적이다.
 */
export function capCurriculum(list, max = 1) {
  let kept = 0;
  return list.filter((p) => {
    if (!isCurriculum(p)) return true;
    kept += 1;
    return kept <= max;
  });
}

export function sortForDisplay(list) {
  return [...list].sort((a, b) => {
    // ★ 정규 교육과정(모듈전공·마이크로디그리)은 비교과 프로그램 뒤로 보낸다.
    //   "이 트랙을 이수하세요"는 "이 프로그램에 신청하세요"보다 훨씬 무거운 제안이고,
    //   이 도구가 약속한 것은 갭을 메우는 ★프로그램★이다.
    const ac = isCurriculum(a) ? 1 : 0;
    const bc = isCurriculum(b) ? 1 : 0;
    if (ac !== bc) return ac - bc;

    // ★ "관심 분야"는 목표 역량과 무관한 항목이라 맨 뒤로 보낸다.
    //   실측에서 어학 연수가 맨 위에 왔는데 4개 모델이 전부 2~3점을 줬다.
    //   학생이 직접 원한 것이므로 보여주는 게 맞지만, 갭을 메우는 것이 먼저다.
    const ai = String(a.gapSkill || '').startsWith(INTEREST_PREFIX) ? 1 : 0;
    const bi = String(b.gapSkill || '').startsWith(INTEREST_PREFIX) ? 1 : 0;
    if (ai !== bi) return ai - bi;

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
export function parseJson(text, fallback = []) {
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

  // ④ ★ 응답이 도중에 잘린 경우 — 완성된 객체만 건져낸다
  //
  //    max_tokens 에 걸려 이렇게 끝나는 일이 실제로 있다:
  //      [{"name":"SQL",...},{"name":"Python",...},{"name":"통계
  //                                                          ↑ 여기서 끝
  //    ③은 depth 0 에서만 덩어리를 뱉는데, 여는 [ 가 닫히지 않아
  //    depth 가 0 으로 돌아오지 않는다. → ★완성된 객체가 2개 있어도 전부 버려진다.★
  //    그러면 1단계가 0건이 되고 파이프라인이 그 자리에서 멈춘다.
  //    (2026-08-07 심사 시뮬레이션에서 「웹 프론트엔드 개발자」로 재현됐다)
  //
  //    잘린 마지막 항목만 버리고 나머지는 살린다. 8개 중 6개라도 분석은 된다.
  const salvaged = extractObjects(s);
  if (salvaged.length) {
    console.warn(`[파서] 응답이 잘린 것으로 보입니다. 완성된 객체 ${salvaged.length}개를 건졌습니다.`);
    return salvaged;
  }

  return fallback;
}

/**
 * 배열이 닫혔든 안 닫혔든 상관없이, 균형이 맞는 객체 `{...}` 를 전부 찾는다.
 * 대괄호는 세지 않고 중괄호만 센다 — 잘린 배열 안의 객체를 건지는 것이 목적이다.
 */
function extractObjects(s) {
  const out = [];
  let depth = 0, startIdx = -1, inStr = false, esc = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];

    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }

    if (c === '{') {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (c === '}') {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && startIdx >= 0) {
        try { out.push(JSON.parse(s.slice(startIdx, i + 1))); } catch { /* 이 덩어리는 버린다 */ }
        startIdx = -1;
      }
    }
  }
  return out;
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
- 막연한 인성 표현("성실함", "열정")은 빼라.
  ★단, 상담·의사소통·아동 이해처럼 그 직무의 핵심으로 채용공고에 실제로 적히는
  대인 역량은 구체적인 역량이므로 반드시 포함해라.★
  (돌봄·교육·보건·서비스 직군은 이런 역량이 요구사항의 절반 이상이다)
- 각 항목에 왜 필요한지 한 줄 근거와, 그 근거가 된 실제 채용공고/기업 페이지 출처 URL

형식:
[{"name":"역량명","reason":"왜 필요한지 한 줄","sourceUrl":"출처"}]`,
    // ★ 1500 → 2600.
    //   한국어는 토큰을 많이 먹는다. 8개 항목에 이유와 URL 까지 붙으면
    //   1500 에서 배열 중간이 잘리고, 그러면 1단계가 0건이 되어 파이프라인이 멈춘다.
    //   페르소나 평가에서 이미 같은 일을 겪었다(900 → 2500).
    //   파서도 잘린 배열을 구제하도록 고쳤지만(parseJson ④),
    //   애초에 안 잘리게 하는 것이 먼저다.
    maxTokens: 2600,
  });

  const raw = parseJson(text, []);
  const list = Array.isArray(raw) ? raw : [];

  // 0건으로 끝나면 파이프라인이 여기서 멈춘다. 원인을 구분해서 남긴다 —
  // 모델이 빈 답을 준 것인지, 우리가 파싱을 못 한 것인지 로그 없이는 알 수 없다.
  if (!list.length) {
    console.warn('[1단계] 요구 역량 0건', {
      목표: target,
      응답길이: (text || '').length,
      citations: citations.length,
      응답앞부분: (text || '').slice(0, 200),
    });
  }

  // 출처가 없는 항목은 citations 에서 보충한다 (인덱스가 안 맞을 수 있어 citations[0] 도 최후 수단으로 둔다).
  // 그래도 citations 자체가 아예 없으면(= 검색이 근거를 하나도 못 찾음) 그 항목은 뺀다.
  return list
    .map((s, i) => ({
      name: String(s.name || '').trim(),
      reason: String(s.reason || '').trim(),
      // ★ 모델이 뱉은 문자열이 그대로 <a href> 가 된다 (ui.js "근거 보기").
      //   여기서 스킴을 확인하지 않으면 `javascript:...` 를 넣을 수 있다.
      //   목표·채용공고 URL 은 사용자가 입력하고 그대로 프롬프트에 들어가므로,
      //   공격자가 만든 채용공고 페이지 본문에 지시문을 심으면
      //   ★피해자가 링크를 붙여넣기만 해도★ 성립한다 (간접 프롬프트 인젝션).
      //   아래 프로그램 카드(sourceUrl)에는 isAllowedSource 방어가 있는데 여기만 빠져 있었다.
      sourceUrl: safeHttpUrl(s.sourceUrl || citations[i] || citations[0] || ''),
    }))
    // ★ 이름만 있으면 남긴다. 출처가 없다고 항목을 버리지 않는다.
    //
    //   전에는 `s.name && s.sourceUrl` 이었다. 그런데 시스템 프롬프트가 이미 모델에게
    //   "출처를 확인할 수 없는 역량은 답에서 빼라"고 시키고 있어서, 여기서 한 번 더 거르면
    //   ★이중 필터★가 된다. "데이터 분석가"로 실측했더니 요구 역량이 0건이 되어
    //   파이프라인이 1단계에서 멈췄다 (2회 재현, 각 28크레딧).
    //
    //   요구 역량은 "교내에 이런 프로그램이 있다"는 주장이 아니라 분석의 입력값이다.
    //   출처 원칙은 ★프로그램 추천★에 적용되는 것이지, 분석 자체를 죽이라는 뜻이 아니다.
    //   출처가 없으면 "근거 보기" 링크만 안 뜬다 (ui.js 가 이미 조건부로 그린다).
    .filter((s) => s.name);
}

/**
 * http/https 만 통과시킨다. 그 외(javascript:, data:, file: …)는 빈 문자열.
 *
 * ★스킴이 없는 주소를 버리면 안 된다.★
 *   모델은 `www.jobkorea.co.kr/Recruit/123` 처럼 스킴 없이 적는 일이 잦다.
 *   이걸 new URL() 에 그대로 넣으면 예외가 나고, 호출부의 filter 가
 *   그 항목을 통째로 지운다 — 요구 역량이 0건이 되어 파이프라인이 멈춘다.
 *   (안전장치를 넣다가 멀쩡한 결과를 죽이는, 이 프로젝트에서 반복해서 만난 실수다.)
 *   도메인처럼 생겼으면 https 를 붙여서 살린다.
 */
export function safeHttpUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';

  const parse = (candidate) => {
    try {
      const x = new URL(candidate);
      return (x.protocol === 'https:' || x.protocol === 'http:') ? x.href : '';
    } catch {
      return '';
    }
  };

  const direct = parse(s);
  if (direct) return direct;

  // 스킴이 아예 없을 때만 https 를 붙여본다.
  // 이미 `javascript:` 같은 스킴이 있으면 여기 오지 않는다 (아래 정규식이 막는다).
  if (/^[^\s:]+\.[a-z]{2,}(?:[:/?#]|$)/i.test(s)) return parse(`https://${s}`);
  return '';
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
/** 관심 분야로 찾은 항목의 gapSkill 앞에 붙인다 — 화면에서 갭과 구분되도록 */
export const INTEREST_PREFIX = '관심 분야: ';

/**
 * @param {import('./types.js').GapSkill[]} gaps
 * @param {string} [interestAreas]  전공과 무관하게 참여하고 싶은 분야 (예: "어학, 자격증")
 */
export async function searchPrograms(gaps, interestAreas, opts = {}) {
  const gapList = gaps.map((g) => `- ${g.name} (${g.reason})`).join('\n');
  const today = todayISO();

  // ★ 갭과 별개로 "그냥 하고 싶은 것"을 받는다.
  //   목표 역량만으로 추천하면 "전공과 무관하지만 어학 프로그램은 듣고 싶다" 같은
  //   실제 수요가 화면에 나올 자리가 없다.
  //   갭을 대체하는 게 아니라 ★따로 한 묶음 더★ 찾아준다.
  const interest = String(interestAreas || '').trim();
  const interestBlock = interest
    ? `\n\n[역량과 별개로 참여하고 싶은 분야]\n- ${interest}\n`
      + `   이 분야 프로그램도 1~2개 찾아서 함께 넣어라.\n`
      + `   ★그 항목의 gapSkill 은 "${INTEREST_PREFIX}${interest}" 로 적어라.★\n`
      + `   부족한 역량과는 관계없어도 된다. 학생이 직접 원한 것이다.`
    : '';

  const { text, citations } = await callModel({
    task: TASK.SEARCH_PROGRAMS,
    system: `너는 명지전문대학의 교내 프로그램을 찾아주는 도우미다.
오늘은 ${today}이다. 신청 기간이나 진행 기간이 이미 끝난 것이 명백한 프로그램은 제외해라.
모집 전이거나 진행 중이거나 상시 모집이면 포함해라.

${DOMAIN_GUARD}

${NO_JUDGMENT_GUARD}

★ 검색할 때 반드시 ★site:mjc.ac.kr★ 을 질의에 넣어라.
   이것을 넣지 않으면 명지대학교(mju.ac.kr)와 외부 학원·강의 사이트가 섞여 들어온다.
   (실측: 넣지 않으면 출처의 35%만 mjc, 넣으면 100%)

찾아볼 곳 (모두 ${ALLOWED_DOMAIN} 하위 — 직접 조사해 확인한 목록이다):
- www.mjc.ac.kr    대학 공지·학사공지. 비교과·자격증·장학 공지가 가장 많다
- cls.mjc.ac.kr    학과 공지판. 전교 공지를 미러링해 제목이 온전히 실린다
- sanhak.mjc.ac.kr 산학협력·현장실습(WE-GO, Co-op)·캡스톤디자인
- rise.mjc.ac.kr   RISE사업단. 다만 상당수가 성인학습자 대상이다
- inter.mjc.ac.kr  국제교류·글로벌 현장학습
- mrcc.mjc.ac.kr   지역협력·리빙랩

★ 아래는 재학생 대상이 아니므로 검색에서 제외해라:
- edu.mjc.ac.kr    평생교육본부 — 성인 대상 유료과정이다 (재학생 프로그램이 아니다)
- ipsi.mjc.ac.kr   입시 안내
${JSON_ONLY}`,
    user: `site:mjc.ac.kr 로 검색해서, 아래 역량을 기를 수 있는 명지전문대학 교내 프로그램을 찾아줘.
오늘 날짜는 ${today}이다.

[부족한 역량]
${gapList}${interestBlock}

- 역량 하나당 1~2개씩, 전체 4~8개 ─ 이건 상한이지 채워야 할 목표가 아니다.
  ★해당 역량과 진짜로 관련 있는 걸 못 찾았으면, 억지로 끼워맞추지 말고 그 역량은 그냥 빼라.★
  예를 들어 "아동 관찰 기록"을 검색했는데 관련 없는 IT 특강만 나온다면, IT 특강을
  "아동 관찰 기록"의 답으로 욱여넣지 마라 — 0개로 남기는 게 맞다.
  없는 것을 없다고 하는 것보다, 무관한 것을 관련 있다고 우기는 게 훨씬 나쁘다
  (학생이 엉뚱한 프로그램에 시간을 쓰게 된다).
- 비교과 프로그램, 특강, 자격증 과정, 현장실습, 경진대회 등 무엇이든 좋다
- 각 항목에 반드시 출처 URL을 붙여라. 출처가 없으면 그 항목을 빼라.

★ 반드시 "재학생이 신청해서 참여하는 활동"이어야 한다.
   다음은 프로그램이 아니므로 제외해라 —
   학과·전공·트랙 소개, 교육과정 안내, 입시·모집요강, 학칙·규정,
   시설 안내, 조직도, 인사말, 연혁, 채용공고(교직원), 졸업요건 안내.
   판별 기준: "신청" 또는 "모집"이라는 행위가 있는가? 없으면 빼라.

★ www.mjc.ac.kr 에만 몰리지 않게 해라.
   특히 sanhak.mjc.ac.kr(현장실습·캡스톤)과 cls.mjc.ac.kr(학과 공지판)도 확인해라.
   서로 다른 서브도메인에서 나오는 것이 정상이다.

★ 외부 기관의 광고성 공지를 교내 프로그램으로 착각하지 마라.
   mjc.ac.kr 에 올라와 있어도 "KDT", "부트캠프", "국비지원", "○○아카데미 모집" 처럼
   외부 기관이 운영하는 것은 교내 프로그램이 아니다. 제외해라.

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
  //   ★그리고 mjc.ac.kr 안에도 "재학생이 신청하는 프로그램"이 아닌 것이 많다.
  //     호스트 검사만으로는 못 막는다 — isStudentProgram() 이 그것을 본다.
  const matchesRaw = list
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
    .filter((p) => p.programTitle && isAllowedSource(p.sourceUrl));

  // 프로필에서 "장애학생 지원 대상"을 선택하지 않았으면 해당 프로그램은 제외한다.
  //   선택했으면 그대로 함께 찾는다.
  const wantsDisability = opts.supportDisability === true;

  const matches = matchesRaw
    .filter((p) => isStudentProgram(p))
    .filter((p) => wantsDisability || !isDisabilitySupportProgram(p))
    .map((p) => ({
      ...p,
      sourceDomain: safeHost(p.sourceUrl),
    }));

  const droppedForSource = list.length - matchesRaw.length;
  const droppedForNotProgram = matchesRaw.length - matches.length;

  // ── P0-2. 모집 상태 판정 ──────────────────────
  //   ★순서가 중요하다★ — 판정을 ★먼저★ 하고, 살아남은 것을 기준으로 보충한다.
  //
  //   전에는 보충을 먼저 했다. 그러면 어떤 갭에 대해 2024년 만료 공지 하나만
  //   나와도 그 갭이 "이미 채워짐"으로 표시되고, 뒤에서 그게 일정 탈락으로
  //   사라져도 수집 데이터가 그 갭을 보충하지 못했다.
  //   실측: 모델이 6건을 냈는데 4개 갭이 전부 covered 처리 → 보충 0건 →
  //         일정 탈락 5건 → 화면에 1건만 남았다.
  // 위쪽 today 는 프롬프트에 넣는 문자열(todayISO)이라 이름을 달리한다
  const now = new Date();
  const judge = (p) => attachAvailability(p, now);

  const searchJudged = matches.map((m) => judge({ ...m, origin: 'search' }));
  const searchAlive = searchJudged.filter((p) => canRecommend(p, now));

  // ★ 검색이 못 메운 갭을 수집 데이터로 보충한다.
  //   기준은 ★일정 판정을 통과해 살아남은 것★이다.
  //   실시간 검색은 "지금 열려 있는 것"에 강하지만 놓치는 게 많다.
  //   그래서 직접 조사해 URL까지 확인한 143건에서 마저 채운다.
  //   출처는 똑같이 표시하고, 어디서 온 항목인지(origin)도 숨기지 않는다.
  const covered = new Set(searchAlive.map((m) => m.gapSkill));
  const seenTitles = new Set(searchAlive.map((m) => m.programTitle));
  const supplemented = [];

  // 갭 + 관심 분야를 같은 방식으로 보충한다
  const wanted = [
    ...gaps.map((g) => g.name),
    ...(interest ? [`${INTEREST_PREFIX}${interest}`] : []),
  ];

  for (const name of wanted) {
    const g = { name };
    if (covered.has(g.name)) continue;
    // 관심 분야는 접두사를 떼고 검색해야 한다
    const query = g.name.startsWith(INTEREST_PREFIX)
      ? g.name.slice(INTEREST_PREFIX.length)
      : g.name;
    for (const p of findFallback([query], 2)) {
      if (seenTitles.has(p.programTitle)) continue;
      // 검색 결과와 동일하게 적용한다 — 안 그러면 수집 데이터로 새어 나온다
      if (!wantsDisability && isDisabilitySupportProgram(p)) continue;
      if (!isStudentProgram(p)) continue;
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

  const suppJudged = supplemented.map(judge);
  const suppAlive = suppJudged.filter((p) => canRecommend(p, now));

  const recommendable = [...searchAlive, ...suppAlive];
  const droppedForSchedule = (searchJudged.length - searchAlive.length)
    + (suppJudged.length - suppAlive.length);

  // ── P0-1. 출처 URL 실검증 ─────────────────────
  //   형식만 mjc.ac.kr 인 URL 과 실제로 열리는 페이지는 다르다.
  //   브라우저는 CORS 때문에 확인할 수 없으므로 서버 함수에 맡긴다.
  //   ★실패해도 추천을 막지 않는다★ — 검증은 부가 정보이지 전제 조건이 아니다.
  // 링크 성격을 먼저 표시해야 검증 결과를 올바르게 낮출 수 있다
  const verified = await attachSourceStatus(markLinkKind(recommendable));

  // broken 만 제외한다. unverified 는 "확인 필요"로 남긴다.
  const visible = verified.filter((p) => p.sourceStatus !== 'broken');
  const droppedForBrokenLink = verified.length - visible.length;

  // 정규 교육과정은 최대 1건만 남긴다 — 카탈로그가 화면을 덮지 않게
  const capped = capCurriculum(visible, 1);
  const droppedForCurriculum = visible.length - capped.length;

  return {
    matches: sortForDisplay(capped),
    droppedForCurriculum,
    removedSources: removed,
    droppedForSource,
    droppedForSchedule,
    droppedForNotProgram,
    droppedForBrokenLink,
    supplementedCount: supplemented.filter(
      (s) => visible.some((v) => v.programTitle === s.programTitle),
    ).length,
    collectedAt: FALLBACK_COLLECTED_AT,
  };
}

// ─────────────────────────────────────────────
//  3-B단계 · 교외 활동 검색 (선택)
//
//  ★왜 넣었나.★
//  방학에 써 보니 결과가 비었다. 팀원 말로는 학기 중이 아니라
//  올라온 교내 공지 자체가 적어서인데, 실제로 그렇다 —
//  교내 자료를 아무리 잘 뒤져도 없는 것은 안 나온다.
//  게다가 수집 자료에는 유니티·언리얼·C#·머신러닝이 ★0건★이라,
//  게임과 학생이 자기 전공대로 목표를 적으면 메울 것이 없다.
//
//  그래서 학교 밖 공모전·대외활동을 ★따로 한 묶음★ 찾아준다.
//
//  ★교내 결과와 절대 섞지 않는다.★
//  이 도구가 신뢰를 얻은 근거는 "출처를 mjc.ac.kr 로 제한한다"였다.
//  그 약속을 깨지 않으려면, 밖에서 가져온 것은
//    · 기본적으로 꺼져 있고 (학생이 직접 켜야 한다)
//    · scope:'external' 로 표시되어 화면에서 따로 묶이고
//    · 출처 검증(verify-source)이 교내 전용이라 검증되지 않는다는 것을
//      숨기지 않고 알린다.
//  섞어 놓고 "다 찾아줍니다"라고 하는 편이 보기엔 좋지만,
//  그 순간 교내 결과의 신뢰도까지 같이 떨어진다.
// ─────────────────────────────────────────────

/**
 * 교외 공모전·대외활동을 찾는다.
 *
 * @param {Array<{name:string,reason?:string}>} gaps  부족한 역량
 * @param {string} target        목표 기업·직군 (검색어를 좁히는 데 쓴다)
 * @param {string|null} interestAreas
 * @returns {Promise<{matches:Array, removed:string[]}>}
 */
export async function searchExternalActivities(gaps, target, interestAreas) {
  const gapList = gaps.map((g) => `- ${g.name}`).join('\n');
  const today = todayISO();
  const interest = String(interestAreas || '').trim();

  const { text } = await callModel({
    task: TASK.SEARCH_EXTERNAL,
    system: `너는 대학생이 참여할 수 있는 ★교외★ 공모전·대외활동을 찾아주는 도우미다.
오늘은 ${today}이다.

★여기서 찾는 것은 학교 밖 활동이다.★ 명지전문대학 교내 프로그램은 이미 따로 찾았으므로
mjc.ac.kr 안의 것은 넣지 마라. 중복된다.

찾을 것 — ★위에서부터 우선순위다.★
① 공모전, 경진대회, 해커톤
② 대외활동, 서포터즈, 기자단, 홍보대사
③ 기업·기관 주관 교육 프로그램, 부트캠프, 챌린지
④ 인턴십·현장실습 ─ ★최대 1건까지만.★

★①②를 먼저 채워라.★
   실측해 보니 ④(채용공고)만 잔뜩 가져오는 일이 있었다.
   1학년에게 계약직 채용공고 두 개를 주는 것은 이 학생이 원한 답이 아니다.
   ①②에서 찾은 것이 하나도 없을 때에만 ④로 채워라.

${NO_JUDGMENT_GUARD}

★신청 마감이 이미 지난 것은 넣지 마라.★ 공모전은 마감이 곧 전부다.
   마감일을 확인할 수 없으면 넣되 applicationEndAt 을 null 로 둬라. 지어내지 마라.

★전문대 1~2학년이 실제로 지원할 수 있는 것을 우선해라.★
   대학원생·경력자 대상, 특정 대학 재학생 한정은 빼라.
${JSON_ONLY}`,
    user: `아래 학생이 참여할 만한 ★학교 밖★ 공모전·대외활동을 찾아줘.
오늘 날짜는 ${today}이다.

[목표] ${target}
[부족한 역량]
${gapList}${interest ? `\n[관심 분야] ${interest}` : ''}

- 전체 3~4개 ─ 상한이지 채워야 할 목표가 아니다.
  ★적게, 빨리 답해라.★ 이 검색은 50초 안에 끝나야 한다.
  더 찾으려고 오래 끌면 학생은 아무것도 못 받는다.
  ★관련 있는 걸 못 찾았으면 억지로 채우지 말고 적게 내라.★
- ★공모전·대외활동을 먼저 채우고, 채용공고는 최대 1건까지만 넣어라.★
  이 학생은 1학년이다. 지금 필요한 것은 이력서에 쓸 활동이지 취업 공고가 아니다.
- 각 항목에 반드시 ★열리는 출처 URL★을 붙여라. 없으면 그 항목을 빼라.
- host 에는 주관 기관을 적어라 (예: "한국콘텐츠진흥원", "네이버 커넥트재단").

형식:
[{"gapSkill":"어떤 역량을 메우는지","programTitle":"활동명","summary":"한 줄 설명","sourceUrl":"출처","host":"주관 기관","postedAt":"게시일 또는 null","applicationStartAt":null,"applicationEndAt":null,"eventStartAt":null,"eventEndAt":null}]`,
    // 3~4건이면 1,200토큰으로 충분하다. 넉넉히 잡으면 그만큼 오래 생성한다.
    maxTokens: 1200,
  });

  const raw = parseJson(text, []);
  const list = Array.isArray(raw) ? raw : [];
  const removed = [];

  const cleaned = list
    .map((p) => ({
      gapSkill: String(p.gapSkill || '').trim(),
      programTitle: String(p.programTitle || '').trim(),
      summary: String(p.summary || '').trim(),
      // ★여기서도 링크는 반드시 씻는다.★ 교내가 아니라고 해서 아무 스킴이나
      //   받아주면 javascript: 가 그대로 화면의 href 로 들어간다.
      sourceUrl: safeHttpUrl(p.sourceUrl),
      host: String(p.host || '').trim() || null,
      postedAt: p.postedAt || null,
      department: null,
      applicationStartAt: p.applicationStartAt || null,
      applicationEndAt: p.applicationEndAt || null,
      eventStartAt: p.eventStartAt || null,
      eventEndAt: p.eventEndAt || null,
      scope: 'external',
      origin: 'external',
    }))
    .filter((p) => {
      if (!p.programTitle || !p.sourceUrl) return false;
      // ★교내 것이 섞여 오면 뺀다.★ 교내는 이미 따로 찾았으니 중복이고,
      //   무엇보다 "교외" 칸에 교내 것이 있으면 구분 자체가 무너진다.
      if (isAllowedSource(p.sourceUrl)) { removed.push(p.sourceUrl); return false; }
      return true;
    })
    .map((p) => ({ ...p, sourceDomain: safeHost(p.sourceUrl) }));

  // 같은 활동이 두 번 오는 경우가 있어 제목으로 한 번 접는다
  const seen = new Set();
  const deduped = cleaned.filter((p) => {
    if (seen.has(p.programTitle)) return false;
    seen.add(p.programTitle);
    return true;
  });

  // 마감이 지난 것은 교내와 ★같은 규칙★으로 떨어뜨린다 (attachAvailability 주석 참조)
  const now = new Date();
  const matches = deduped
    .map((p) => attachAvailability(p, now))
    .filter((p) => canRecommend(p, now));

  return { matches, removed };
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

  // ★ 타임아웃을 반드시 건다.
  //   출처 검증은 "있으면 좋은 정보"이지 추천의 전제조건이 아니다.
  //   최악의 경우 20건 ÷ 동시 5 × 9초 = 36초가 걸리는데, 학교 서버가 느린 날엔 더 늘어난다.
  //   그 시간이 3단계 스피너 안에서 흐르므로 화면은 멈춘 것처럼 보인다.
  //   끝나지 않는 것보다 포기하고 배지 없이 추천을 내보내는 편이 낫다.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 40_000);

  try {
    const res = await fetch('/api/verify-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        items: list.slice(0, 20).map((p) => ({ url: p.sourceUrl, title: p.programTitle })),
      }),
    });
    if (!res.ok) return withNull(`검증 서버 응답 ${res.status}`);

    const data = await res.json();
    const byUrl = new Map((data.results || []).map((r) => [r.url, r]));

    return list.map((p) => {
      const r = byUrl.get(p.sourceUrl);
      let status = r?.status ?? null;
      let error = r?.error ?? null;

      // ★ "페이지가 열린다"와 "이 URL이 이 프로그램 것이다"는 다른 질문이다.
      //
      //   목록·첫 화면에는 프로그램 이름이 전부 실려 있어서 제목 매칭이 통과한다.
      //   실측: mpu 15건이 첫 화면 하나를 공유하는데 전부 verified 로 나왔다.
      //   그대로 두면 ★가장 잘못된 링크에 "공식 원문 확인됨" 배지가 붙는다.★
      //   열리는 것 자체는 맞으므로 broken 은 아니다 — unverified 로 낮춘다.
      if (status === 'verified' && (p.linkKind === 'list' || p.isSharedSource)) {
        status = 'unverified';
        error = p.linkKind === 'list'
          ? '개별 공지가 아니라 목록 페이지입니다. 페이지에서 프로그램명을 찾아주세요.'
          : '여러 프로그램이 함께 안내된 페이지입니다.';
      }

      return {
        ...p,
        sourceStatus: status,
        sourceCheckedAt: r ? data.checkedAt : null,
        sourceError: error,
        // 공지 본문에 올라온 포스터. 서버가 이미 받아둔 HTML 에서 꺼내므로 추가 요청이 없다.
        // 못 찾았으면 null 이고 화면은 아무것도 그리지 않는다.
        poster: r?.poster ?? null,
      };
    });
  } catch (e) {
    const reason = e?.name === 'AbortError' ? '검증 서버 응답 지연(40초 초과)' : (e?.message || e);
    console.warn('[출처 검증 건너뜀]', reason);
    // 검증에 실패해도 추천 자체는 그대로 내보낸다 — 배지만 안 붙는다.
    return withNull(null);
  } finally {
    clearTimeout(timer);
  }
}

function safeHost(url) {
  try { return new URL(url).hostname; } catch { return ''; }
}

// ─────────────────────────────────────────────
//  링크가 "그 프로그램 하나"를 가리키는가
//
//  ★ 팀원 보고: "공식 공지 열기가 스마트케어에 있는 프로그램이면
//     해당 프로그램 공지가 아니라 스마트케어 페이지로만 넘어간다"
//
//  실측 결과 수집 143건 중 63건(44%)이 개별 공지가 아니었다.
//    mpu 16건 → URL 2개를 공유. 그중 15건이 첫 화면 하나를 가리킨다
//    www ibuilder.do?menu_idx=3135 하나가 융복합 모듈전공 10개 트랙 전부의 출처
//
//  ★ 그리고 이게 더 위험하다 —
//    verify-source 는 "페이지가 열리고 제목 낱말이 있으면" verified 를 준다.
//    목록 페이지에는 프로그램 이름이 ★전부★ 실려 있으므로 제목 매칭이 통과한다.
//    즉 ★가장 잘못된 링크에 가장 강한 신뢰 배지가 붙는다.★
//    "페이지가 열린다"와 "이 URL이 이 프로그램 것이다"는 다른 질문이다.
// ─────────────────────────────────────────────

/** 게시판 엔진마다 상세 URL 규칙이 다르다. 식별자 유무까지 본다 */
const DEEP_PATTERNS = [
  /\/bbs\/data\/view\.do\?.*\bdata_idx=BD\d+/i,   // www · cls · inter (ibuilder)
  /BdCm010D\.do\?.*\bBBS_NO=\d+/i,                // sanhak 게시판 상세
  /WoUser0101V\.do\?.*\bWO_SEQ=\d+/i,             // sanhak 채용 상세
  /_view\.html\?.*\bno=\d+/i,                     // rise · mrcc 정적 상세
  /Notice(?:View|List)\.aspx\?.*\bnnum=\d+/i,     // mpu 공지 상세
];

/** 열리기는 하지만 그 프로그램을 찾을 수 없는 목록·첫 화면 */
const LIST_PATTERNS = [
  /\/bbs\/data\/list\.do\b/i,
  /\/Main\/default\.aspx$/i,
  /RecruitCalendar\.aspx$/i,
  /mrcc\.mjc\.ac\.kr\/(?:volunteer\/program_previous|application\/notice)\.html$/i,
  /^https?:\/\/[^/]+\/?$/i,                       // 도메인 루트
];

/** @returns {'notice'|'list'|'page'} */
export function linkKind(url) {
  const u = String(url || '');
  if (DEEP_PATTERNS.some((p) => p.test(u))) return 'notice';
  if (LIST_PATTERNS.some((p) => p.test(u))) return 'list';
  return 'page';   // 여러 과정을 함께 안내하는 페이지
}

/**
 * 같은 URL 을 여러 프로그램이 출처로 쓰면 그 프로그램 전용 페이지가 아니다.
 * linkKind 만으로는 안 잡힌다 — ibuilder.do?menu_idx=3135 는 형식상 'page' 지만
 * 실제로는 10개 트랙이 공유한다.
 */
export function markLinkKind(list) {
  const count = new Map();
  for (const p of list) count.set(p.sourceUrl, (count.get(p.sourceUrl) || 0) + 1);
  return list.map((p) => ({
    ...p,
    linkKind: linkKind(p.sourceUrl),
    isSharedSource: (count.get(p.sourceUrl) || 0) > 1,
  }));
}

// ─────────────────────────────────────────────
//  "재학생이 신청하는 프로그램"인지 판별한다
//
//  ★ 호스트 검사만으로는 못 막는다.
//    mjc.ac.kr 안에도 프로그램이 아닌 것이 아주 많다.
//
//    실측으로 확인된 것들:
//      · 「실습세미나(유아교육과)」        → 학과 교과목이다. 신청하는 게 아니다
//      · edu.mjc.ac.kr 평생교육본부 과정   → 성인 대상 유료과정 (재학생 아님)
//      · 「[게임부트캠프] Unity 개발자…」   → 실체는 외부 KDT 광고(엘리스트랙)
//      · 대학요람 PDF, 학칙, 입시요강
//
//    프롬프트로 "제외해라"라고 지시해봤지만 계속 통과했다.
//    mju 오염·마감 프로그램·깨진 링크를 코드로 막았던 것과 같은 방식으로 처리한다.
// ─────────────────────────────────────────────

/** 재학생 대상이 아닌 하위 도메인 */
const NON_STUDENT_HOSTS = [
  'edu.mjc.ac.kr',    // 평생교육본부 — 성인 대상 유료과정
  'ipsi.mjc.ac.kr',   // 입시
  'admission.mjc.ac.kr',
];

/**
 * 제목·요약에 있으면 "신청하는 프로그램"이 아니라고 본다.
 *
 * ★ 처음에는 반대로 만들었다 — "신청·모집 같은 말이 있어야 통과".
 *   그랬더니 수집 143건 중 46%만 남고 ★진짜 프로그램까지 죽었다★
 *   (마이크로전공과정·현장실습학기제·취업동아리·잡카페 상담 …).
 *   정당한 프로그램도 제목에 신청이라는 말이 없는 경우가 많기 때문이다.
 *
 *   그래서 ★아는 불순물만 빼고 나머지는 통과★시킨다.
 *   놓치는 것보다 멀쩡한 것을 죽이는 쪽이 더 나쁘다.
 */
const NOT_A_PROGRAM = [
  // ── 학과·교과 안내 (초윤님이 보고한 "재학생 대상인데 학과를 추천" 케이스) ──
  '교과목', '커리큘럼', '이수체계', '학과 소개', '학과소개', '학과 안내',
  '전공 소개', '전공소개', '교수진', '졸업요건', '전공 교육과정', '학과 교육과정',
  '대학요람', '학칙', '요람', '시행세칙', '_college_info',
  '모집요강', '입학 안내', '신입생 모집', '수시 모집', '정시 모집', '편입학',
  '교직원 채용', '직원 채용', '교원 초빙', '조교 채용',
  // ── 외부 기관 광고 — mjc 게시판에 올라오지만 교내 프로그램이 아니다 ──
  'kdt', '부트캠프', '국비지원', '내일배움', '엘리스', '패스트캠퍼스', '이젠아카데미',
  // 외부 기관이 mjc 게시판에 올린 것 (실측으로 추가, 폴백·실측 0사망 확인)
  '강사 모집', '강사모집', '평생교육진흥원', '인재평생', '해외배낭', '구민',
  '재테크', '테라피스트', '전문가 과정 모집', '데이터안심구역',
  '실습생 모집', '현장실습생 모집',
  //
  // ⚠️ 아래는 차단 효과가 컸지만 ★일부러 넣지 않았다★
  //    '장애대학생'·'장애학생' (26건 차단, 지금은 0사망)
  //      → 교내 장애학생 지원 프로그램이 생기면 통째로 막힌다. 형평성 문제다.
  //    '자원봉사자 모집' (7건) → 교내 봉사 프로그램이 걸릴 수 있다.
  //    '서대문' (15건) → 폴백 1건 사망. 학교가 서대문구에 있어 협력 사업이 많다.
  //    '한국어교육센터' → 실측 진짜 프로그램 1건 사망.

  // ── 이하 실측으로 검증한 낱말 (2026-08-07) ────────────────────────────
  //   mjc.ac.kr 게시판 62개에서 실제 게시글 제목 1,055건을 수집해,
  //   사람 기준으로 "재학생 신청 프로그램 / 아닌 것"을 분류한 뒤
  //   ★각 낱말이 진짜 프로그램을 하나라도 죽이면 탈락★시켰다.
  //   (수집 143건 + 실측 진짜 프로그램 106건 양쪽에 돌려 0사망 확인)
  '채용공고', '채용 공고', '공개채용', '채용공지', '신입사원', '경력직', '채용설명회', '일반채용', '추천채용', '직원채용', '채용 의뢰',
  '통합채용', '회의결과', '회의 결과', '회의개최', '회의 개최', '회의자료', '의견조회', '심의위원회', '평의원회', '교무위원회', '업무추진비',
  '입찰공고', '전자견적', '입찰 공고', '낙찰', '수강신청', '등록금', '학자금', '복학', '제적', '학위수여식', '성적조회', '강의평가',
  '중간고사', '기말고사', '재입학', '학위취득유예', '재등록', '교육과정표', '교과과정표', '시간표', '입학식', '분할납부', '납부일정',
  '전과 시행', '반배정', '출석인정', '계절학기', '졸업사정', '공사 안내', '공사안내', '습득물', '분실물', '구내식당', '민원접수',
  '정기소독', '운영시간 안내', '생활관생 모집', '사생 모집', '보안 업데이트', '주의 권고', '스미싱', '피싱', '악성코드', '랜섬웨어',
  '개인정보 유출', '보안 강화 권고', '해킹', '확진자', '코로나', '대응지침', '감염병', '청렴서한문', '행동강령', '윤리강령', '청탁금지법',
  '개정(안)', '시행령', '규정 제·개정', '운영지침', '출근부', '제출 양식', '추천서 양식', '확인서', '서약서', '업무협약', '성과공유회',
  '성료', '감사패', '감사장', '입상자 발표', '선정 결과', '신입생 모집', '특별전형', '원서접수', '모집요강', '국가장학금', '주거안정장학금',
  '장학금 신청', '장학재단', '장학사업', '외부장학', '학자금대출', '기숙사 입사', '대학장학금', '정부초청 장학생', '장학생 선발 협조',
  '가이드북', '실천 가이드', '지식소개', 'ESG 개념', 'ESG경영', 'ESG 경영', '운영결과', '사용 내역', '명세서', '안전관리계획',
  '비밀번호', '교육의뢰서', '설치·운영규정', '오리엔테이션 자료', '학사운영 안내', '무시험검정', '전액우선감면', '일시적 운영 중단', '전과 일정',
  '작성양식', '주의보', '대응 가이드',
];

/**
 * 게시판 자체가 재학생 프로그램용이 아닌 곳.
 * 제목 낱말보다 강력하다 — 단독으로 불순물의 75%를 막는다.
 *
 * ⚠️ menu_idx=3145(소수학생게시판)는 절대 넣지 마라.
 *    「소수집단학생 이타겟(E-Target) 비교과 프로그램」이 그 게시판에 있다.
 */
const NON_STUDENT_BOARDS = new Set([
  '2711', // 홍보게시판 — 외부기관 광고가 대부분 (실측 60건 중 58건이 불순물)
  '2617', // 채용공지 — 외부기업 + 교내 교직원 채용
  '2097', '2096', '2628', '2102', '2881', '3173', '3174', '2095',
  '2720', '269', '2895', '96', '2196', '2710', '138', '2207', '2104',
  '2572', '174', '2578', '2108',
  '1357', '1360', '1363', // swd — 취업정보 · 학생소모임 · 복지뉴스
  '1371', // swd 사회복지현장실습 — 교과 운영 자료다 (실측 진짜 0건 / 불순물 26건)
]);

/** 공백을 없애고 비교한다 — 「교원초빙」과 「교원 초빙」이 같은 것이기 때문 */
function nosp(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '');
}

/**
 * "재학생이 신청하는 교내 프로그램"으로 볼 수 있는가.
 * 확실히 아닌 것만 걸러낸다. 애매하면 통과시킨다.
 *
 * @param {{programTitle:string, summary:string, sourceUrl:string}} p
 * @returns {boolean}
 */
/** 이런 말이 있으면 학과가 운영하더라도 신청 프로그램으로 본다 */
const PROGRAM_WORDS = [
  '프로그램', '인턴십', '실습학기', '캠프', '특강', '경진대회', '공모',
  '모집', '신청', '멘토링', '튜터링', '아카데미', '워크숍', '워크샵', '연수',
];

/**
 * 특정 대상에게만 열려 있는 프로그램인지.
 *
 * ★ 왜 제외가 아니라 "라우팅"인가
 *   장애학생 대상 프로그램을 아무에게나 띄우면 비대상 학생은 헛걸음하고,
 *   민감한 사안이라 불쾌할 수도 있다.
 *   그렇다고 아예 빼면 ★정작 필요한 학생에게 아무것도 안 뜬다.★
 *   그래서 프로필에서 본인이 선택한 경우에만 함께 찾는다.
 *
 *   "자격을 판정하지 않는다"는 원칙과 어긋나지 않는다 —
 *   우리가 판정하는 게 아니라 본인이 직접 고른 것이다.
 */
const DISABILITY_TARGET = ['장애학생', '장애 학생', '장애대학생', '장애 대학생', '소수집단학생'];

export function isDisabilitySupportProgram(p) {
  const t = nosp(`${p.programTitle || ''} ${p.summary || ''}`);
  return DISABILITY_TARGET.some((w) => t.includes(nosp(w)));
}

export function isStudentProgram(p) {
  const host = safeHost(p.sourceUrl).toLowerCase();
  if (NON_STUDENT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return false;

  // ★ 게시판 단위 차단 — 제목 낱말보다 강력하다 (실측: 단독으로 불순물 75% 차단)
  //   홍보게시판(2711)은 실측 60건 중 58건이 외부기관 광고였다.
  const board = String(p.sourceUrl || '').match(/[?&]menu_idx=(\d+)/i)?.[1];
  if (board && NON_STUDENT_BOARDS.has(board)) return false;

  const title = String(p.programTitle || '').trim();

  // ★ 제목만 본다. 설명문에까지 적용하면 멀쩡한 것이 죽는다.
  //   실측: 「표준·자율 현장실습학기제」의 설명에 "교과목"이 들어 있어 제외됐고,
  //        「복수학위 과정」은 설명의 "졸업요건" 때문에 제외됐다.
  //
  // ★ 공백을 없애고 비교한다.
  //   실측에서 "교원 초빙"은 막히는데 「[교원초빙] …」은 통과하고 있었다.
  //   띄어쓰기 한 칸에 규칙이 통째로 무력화되고 있었다.
  const t = nosp(title);
  if (NOT_A_PROGRAM.some((w) => t.includes(nosp(w)))) return false;

  // 학과명이 괄호로 끝에 붙은 형태 — 「실습세미나(유아교육과)」
  // ★단, 프로그램을 뜻하는 말이 있으면 학과가 운영하는 정식 프로그램이다.
  //   「연계 산업체 인턴십 프로그램(커뮤니케이션디자인과)」 같은 것을 죽이면 안 된다.
  if (/\([가-힣]{2,12}(?:학과|과)\)\s*$/.test(title)
      && !PROGRAM_WORDS.some((w) => title.includes(w))) return false;

  return true;
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
      linkKind: m.linkKind ?? 'page',
      isSharedSource: Boolean(m.isSharedSource),
      sourceStatus: m.sourceStatus ?? null,
      sourceCheckedAt: m.sourceCheckedAt ?? null,
      sourceError: m.sourceError ?? null,
      // ★이 함수는 필드를 하나씩 골라 새 객체를 만든다.★
      //   여기 적지 않은 값은 조용히 사라진다.
      //   poster 를 빠뜨려서, 서버는 포스터를 보내고 화면은 못 그리는 상태로
      //   10회 측정을 통째로 낭비했다. 필드를 추가할 때 이 목록을 반드시 함께 고칠 것.
      poster: m.poster ?? null,

      // 교내/교외 구분 — ★여기 빠뜨리면 교외 항목이 교내인 척하며 섞인다.★
      //   위 경고가 정확히 이 자리를 두고 한 말이다.
      scope: m.scope === 'external' ? 'external' : 'campus',
      host: m.host ?? null,

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
export async function run({
  profile, target, jobPostingUrl, interestAreas,
  includeExternal = false,   // 교외 활동도 함께 찾을지 — ★기본은 끔★
  onStage = () => {},
}) {
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
    // ★ 사용자를 탓하지 않는다.
    //   전에는 "목표를 조금 더 구체적인 직무명으로 적어보세요"였다.
    //   그런데 이게 뜬 실제 사례가 「웹 프론트엔드 개발자」·「데이터 분석가」였다 —
    //   둘 다 충분히 구체적인 직무명이다. 실패한 쪽은 사용자가 아니라 우리다.
    //   원인은 대부분 검색 응답이 잘려서 파싱이 안 된 것이고, 다시 하면 대개 된다.
    emit(STAGE.REQUIRED_SKILLS, 'error', null,
      '검색 결과를 받아오지 못했습니다. 다시 시도하면 대개 해결됩니다.');
    throw new Error('요구 역량 없음');
  }
  emit(STAGE.REQUIRED_SKILLS, 'done', requiredSkills);

  // 2단계
  const gapSkills = await step(STAGE.GAP_ANALYSIS,
    () => analyzeGap(requiredSkills, profile),
    '갭 분석 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  emit(STAGE.GAP_ANALYSIS, 'done', gapSkills);

  // 3단계 · 교내 검색 + (켰다면) 교외 검색
  //
  //   ★나란히 돌린다.★ 둘 다 gapSkills 만 있으면 되고 서로를 기다릴 이유가 없다.
  //   처음엔 줄을 세웠는데, 실측해 보니 교외 검색이 50초 상류 타임아웃에 걸렸다.
  //   교외는 site: 제한이 없어 검색 범위가 훨씬 넓어서 교내보다 오래 걸린다.
  //   순차로 두면 그 시간이 전체 소요에 그대로 얹힌다 —
  //   ★켠 사람만 손해 보는 게 아니라 화면 앞에서 기다리는 시간이 통째로 길어진다.★
  //
  //   ★교외는 실패해도 전체를 멈추지 않는다.★ 이건 덤이지 본체가 아니다.
  //   교외가 안 됐다고 교내 결과까지 못 보게 되면 더 나쁘다.
  //   그래서 step() 을 쓰지 않고 여기서 직접 삼킨다.
  let externalFailed = false;
  const externalPromise = includeExternal
    ? searchExternalActivities(gapSkills, target, interestAreas)
        .then((r) => r.matches)
        .catch((e) => {
          externalFailed = true;
          console.warn('[교외 활동 검색 실패 — 교내 결과는 그대로 보여준다]', e?.message || e);
          return [];
        })
    : Promise.resolve([]);

  const {
    matches, removedSources, droppedForSource, supplementedCount, collectedAt,
    droppedForSchedule, droppedForNotProgram, droppedForBrokenLink,
  } = await step(STAGE.PROGRAM_SEARCH,
    () => searchPrograms(gapSkills, interestAreas, {
      supportDisability: profile?.traits?.supportDisability === true,
    }),
    '교내 프로그램을 찾는 중 문제가 생겼습니다. 잠시 후 다시 시도해주세요.');
  emit(STAGE.PROGRAM_SEARCH, 'done', {
    matches, removedSources, droppedForSource, supplementedCount, collectedAt,
    droppedForSchedule, droppedForNotProgram, droppedForBrokenLink,
  });

  // 교내 쪽이 끝난 시점에는 교외도 거의 끝나 있다 (같이 출발했으므로)
  const externalMatches = await externalPromise;

  // 4단계
  //   교외 항목도 같은 4명에게 평가받는다. 교내와 잣대가 다르면
  //   나란히 놓인 점수를 비교할 수 없다.
  const reviewed = await step(STAGE.PERSONA_REVIEW,
    () => reviewByPersonas([...matches, ...externalMatches], profile, target),
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
      droppedForNotProgram,  // mjc 안에 있지만 재학생 신청 프로그램이 아니라서 제외
      droppedForBrokenLink,  // 원문이 실제로 열리지 않아서 제외 (P0-1)
    },
    // 실시간 검색이 못 메운 갭을 수집 데이터로 몇 건 보충했는지
    supplement: { count: supplementedCount, collectedAt },
    // 교외 활동을 켰는지 / 몇 건 나왔는지 / 실패했는지.
    //   화면은 이 값으로 "켰는데 0건"과 "아예 안 켰음"을 구분해 말한다.
    //   둘을 같은 화면으로 보여주면 학생은 기능이 고장난 줄 안다.
    external: {
      requested: includeExternal,
      failed: externalFailed,
      count: reviewed.filter((m) => m.scope === 'external').length,
    },
    // 4명 중 실제로 몇 명이 평가했는지 (실패한 모델이 있으면 여기 남는다)
    review: {
      personaCount: PERSONAS.length,
      failed: reviewed[0]?.failedPersonas || [],
    },
  };
}
