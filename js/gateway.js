/**
 * 게이트웨이 호출 계층
 * ─────────────────────────────────────────────────────────
 * 이 파일이 하는 일은 네 가지다.
 *
 *   1. 모델 라우팅   작업 성격에 맞는 모델을 고른다 (실측 데이터 근거)
 *   2. 응답 캐싱     같은 입력을 두 번 호출하지 않는다
 *   3. 도메인 필터   mjc.ac.kr 이 아닌 출처는 버린다
 *   4. 크레딧 추적   얼마 썼고, 라우팅으로 얼마 아꼈는지 계산한다
 *
 * ─────────────────────────────────────────────────────────
 *  ★ 키 처리 원칙 — 사용자의 키는 우리 서버를 지나가지 않는다
 * ─────────────────────────────────────────────────────────
 *
 *   사용자가 자기 키를 입력한 경우
 *     브라우저 ──────────────────────────────▶ 게이트웨이
 *     (localStorage 의 키를 그대로 사용. 우리 서버를 거치지 않는다)
 *
 *   키 없이 데모 모드로 쓰는 경우
 *     브라우저 ──▶ api/gateway.js ──▶ 게이트웨이
 *                  (서버에만 있는 데모 키를 사용. 브라우저는 그 키를 볼 수 없다)
 *
 *   즉 어느 경로에서도 "남의 키를 볼 수 있는 위치"가 생기지 않는다.
 *   게이트웨이가 CORS 를 허용하기 때문에 이 구조가 가능하다 (2026-08-06 확인).
 */

import { ALLOWED_DOMAIN } from './types.js';

/** 데모 모드 경로 — 서버의 키를 쓴다 */
const PROXY = '/api/gateway';

/** 사용자 키 모드 경로 — 브라우저에서 직접 호출한다 */
const DIRECT_BASE = 'https://factchat-cloud.mindlogic.ai/v1/gateway';

// ─────────────────────────────────────────────
//  모델 실측 데이터
//  동일 작업·동일 프롬프트로 측정한 값 (2026-08-06)
//  이 표가 라우팅 정책의 근거다.
// ─────────────────────────────────────────────

export const MODEL_PROFILE = Object.freeze({
  'solar-pro3':            { credits: 0.07,  seconds: 1.6,  note: '평가 — 국내 모델(Upstage)' },
  'gemini-3.5-flash-lite': { credits: 0.33,  seconds: 1.8,  note: '평가 — Google' },
  'gpt-5.4-nano':          { credits: 1.0,   seconds: 2.0,  note: '분류·판별 등 초경량 작업' },
  'gpt-5.4-mini':          { credits: 1.99,  seconds: 2.8,  note: '주력 — 추론·요약·평가' },
  'claude-sonnet-5':       { credits: 8.0,   seconds: 6.0,  note: '평가 — Anthropic' },
  'sonar-pro':             { credits: 28.0,  seconds: 20.0, note: '실시간 웹 검색 (호출 최소화)' },

  // ── 측정은 했으나 쓰지 않는 모델 ──────────────
  // gemini-3.5-flash 는 답을 쓰기 전에 속으로 1,187토큰을 생각한다.
  // 그 토큰도 과금되는데 결과물은 flash-lite 와 다르지 않았다. (2026-08-06 실측)
  'gemini-3.5-flash':      { credits: 7.90,  seconds: 7.4,  note: '미사용 — 숨은 추론 1,187토큰' },
  // 비교 기준 — 실제로 호출하지 않는다.
  // "가장 좋은 모델만 쓰면 얼마나 드는가"를 계산하기 위한 값.
  'claude-opus-5':         { credits: 52.94, seconds: 25.9, note: '미사용 — 26배 비싸고 9배 느림' },
});

/** 라우팅을 하지 않았을 때의 기준 모델 (절감량 계산용) */
const BASELINE_MODEL = 'claude-opus-5';

// ─────────────────────────────────────────────
//  1. 모델 라우팅
//
//  작업마다 필요한 능력이 다르다.
//   - 실시간 정보가 필요한가        → sonar-pro (검색 내장)
//   - 추론만 하면 되는가            → gpt-5.4-mini (26배 저렴)
//   - 서로 다른 관점이 필요한가     → 벤더가 다른 모델을 섞는다
// ─────────────────────────────────────────────

export const TASK = Object.freeze({
  SEARCH_REQUIRED_SKILLS: 'searchRequiredSkills', // 목표 기업의 요구 역량 — 실시간 정보
  ANALYZE_GAP: 'analyzeGap',                      // 갭 분석 — 추론
  SEARCH_PROGRAMS: 'searchPrograms',              // 교내 프로그램 — 실시간 정보
  CLASSIFY: 'classify',                           // 입력 분류 — 초경량
});

const ROUTE = Object.freeze({
  [TASK.SEARCH_REQUIRED_SKILLS]: 'sonar-pro',
  [TASK.SEARCH_PROGRAMS]: 'sonar-pro',
  [TASK.ANALYZE_GAP]: 'gpt-5.4-mini',
  [TASK.CLASSIFY]: 'gpt-5.4-nano',
});

/**
 * 4개 페르소나에 ★서로 다른 회사의 모델★을 배정한다.
 *
 * 같은 모델 두 개에게 다른 역할만 시키면 관점이 갈리지 않는다.
 * 그래서 벤더를 네 곳으로 나눴다 — OpenAI / Anthropic / Google / Upstage(한국).
 *
 * 모델 선택 근거 (2026-08-06 실측):
 *   senior 는 원래 gemini-3.5-flash 였다. 그런데 이 모델은 답을 쓰기 전에
 *   속으로 1,187토큰을 생각하느라 출력이 잘려 ★평가가 통째로 실패★하고 있었다.
 *   숨은 추론이 없는 flash-lite 로 바꾸니 4배 빨라지고 24배 싸졌다.
 */
export const PERSONA_MODEL = Object.freeze({
  practitioner: 'gpt-5.4-mini',            // OpenAI
  professor: 'claude-sonnet-5',            // Anthropic
  senior: 'gemini-3.5-flash-lite',         // Google
  market: 'solar-pro3',                    // Upstage — 국내 채용 시장 감각
});

export function routeModel(task) {
  const model = ROUTE[task];
  if (!model) throw new Error(`라우팅 정책이 없는 작업: ${task}`);
  return model;
}

// ─────────────────────────────────────────────
//  2. 크레딧 추적
// ─────────────────────────────────────────────

const USAGE_KEY = 'mypath.usage';

/** @returns {{spent:number, baseline:number, saved:number, calls:number}} */
export function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(USAGE_KEY))
      || { spent: 0, baseline: 0, saved: 0, calls: 0 };
  } catch {
    return { spent: 0, baseline: 0, saved: 0, calls: 0 };
  }
}

function recordUsage(model) {
  const u = getUsage();
  const cost = MODEL_PROFILE[model]?.credits ?? 0;
  const baseline = MODEL_PROFILE[BASELINE_MODEL].credits;
  u.spent += cost;
  u.baseline += baseline;
  u.saved = u.baseline - u.spent;
  u.calls += 1;
  localStorage.setItem(USAGE_KEY, JSON.stringify(u));
  return u;
}

// ─────────────────────────────────────────────
//  3. 응답 캐싱
//
//  검색 1회가 약 28크레딧이다. 같은 입력을 두 번 부르면 그대로 두 배 나간다.
//  개발 중에도, 시연 중에도 캐시가 크레딧을 지킨다.
// ─────────────────────────────────────────────

const CACHE_PREFIX = 'mypath.cache.';
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12시간

function cacheKey(payload) {
  // 간단한 문자열 해시 (djb2) — 충돌 위험보다 키 길이 절약이 중요
  const s = JSON.stringify(payload);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return CACHE_PREFIX + (h >>> 0).toString(36);
}

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { at, value } = JSON.parse(raw);
    if (Date.now() - at > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

function cacheSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // 용량 초과 시 캐시를 비우고 조용히 넘어간다
    clearCache();
  }
}

export function clearCache() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith(CACHE_PREFIX))
    .forEach((k) => localStorage.removeItem(k));
}

// ─────────────────────────────────────────────
//  4. 사용자 키
// ─────────────────────────────────────────────

const KEY_STORE = 'mypath.userKey';

export function setUserKey(key) {
  if (key) localStorage.setItem(KEY_STORE, key.trim());
  else localStorage.removeItem(KEY_STORE);
}

export function getUserKey() {
  return localStorage.getItem(KEY_STORE) || '';
}

export function hasUserKey() {
  return Boolean(getUserKey());
}

// ─────────────────────────────────────────────
//  5. 호출
// ─────────────────────────────────────────────

/** 재시도 상한 — 버그로 인한 무한 호출을 원천 차단한다 */
const MAX_RETRY = 2;

/**
 * 게이트웨이 호출. 캐시가 있으면 네트워크를 타지 않는다.
 *
 * @param {Object}  opts
 * @param {string}  opts.task          TASK 중 하나 (모델 자동 선택)
 * @param {string}  [opts.model]       모델을 직접 지정할 때 (페르소나 평가 등)
 * @param {string}  opts.system        시스템 프롬프트
 * @param {string}  opts.user          사용자 프롬프트
 * @param {number}  [opts.maxTokens]
 * @param {boolean} [opts.noCache]     캐시를 건너뛴다
 * @returns {Promise<{text:string, citations:string[], model:string, cached:boolean}>}
 */
export async function callModel({ task, model, system, user, maxTokens = 2000, noCache = false }) {
  const chosen = model || routeModel(task);

  const payload = {
    endpoint: 'chat/completions',
    model: chosen,
    max_tokens: maxTokens,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      { role: 'user', content: user },
    ],
  };

  const key = cacheKey(payload);
  if (!noCache) {
    const hit = cacheGet(key);
    if (hit) return { ...hit, cached: true };
  }

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRY; attempt++) {
    try {
      const data = await send(payload);
      if (data.__error) throw new Error(data.__error);

      const msg = data.choices?.[0]?.message ?? {};
      const result = {
        text: msg.content ?? '',
        citations: data.citations || msg.citations || [],
        model: chosen,
      };

      recordUsage(chosen);
      if (!noCache) cacheSet(key, result);
      return { ...result, cached: false };
    } catch (err) {
      lastError = err;
      // 마지막 시도가 아니면 잠깐 쉬고 재시도
      if (attempt < MAX_RETRY) await sleep(800 * (attempt + 1));
    }
  }
  throw new Error(`게이트웨이 호출 실패 (${MAX_RETRY + 1}회 시도): ${lastError?.message}`);
}

/**
 * 실제 전송.
 * ★ 사용자 키가 있으면 게이트웨이를 직접 호출한다 — 우리 서버를 거치지 않는다.
 *   키가 없을 때만 프록시(데모 모드)로 간다.
 */
async function send(payload) {
  const userKey = getUserKey();
  const { endpoint, ...rest } = payload;

  if (userKey) {
    // ── 직접 호출: 키가 브라우저 밖(우리 서버)으로 나가지 않는다 ──
    const res = await fetch(`${DIRECT_BASE}/${endpoint}/`, {
      method: 'POST',
      headers: { 'x-api-key': userKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(rest),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { __error: data?.detail?.message || data.error || `HTTP ${res.status}` };
    return data;
  }

  // ── 데모 모드: 서버가 자기 키로 대신 호출한다 ──
  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { __error: data.error || `HTTP ${res.status}` };
  return data;
}

/** 크레딧 잔량 조회 */
export async function fetchCredits() {
  const userKey = getUserKey();

  if (userKey) {
    // 직접 호출 (GET)
    const res = await fetch(`${DIRECT_BASE}/credits/`, {
      headers: { 'x-api-key': userKey },
    });
    if (!res.ok) throw new Error('크레딧 조회 실패');
    const data = await res.json();
    return data.total || null;
  }

  const res = await fetch(PROXY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: 'credits' }),
  });
  if (!res.ok) throw new Error('크레딧 조회 실패');
  const data = await res.json();
  return data.total || null; // { quota, used, remaining }
}

// ─────────────────────────────────────────────
//  6. 도메인 필터
//
//  ★ 프롬프트로 "명지대학교는 제외하라"고 지시해도 걸러지지 않는다.
//    실측: 프로그래밍 관련 검색에서 mjc 출처 11건 vs mju 오염 8건.
//    그래서 코드에서 잘라낸다.
// ─────────────────────────────────────────────

/**
 * 출처 목록에서 명지전문대(mjc.ac.kr) 것만 남긴다.
 * @param {string[]} citations
 * @returns {{kept:string[], removed:string[]}}
 */
export function filterCitations(citations = []) {
  const kept = [];
  const removed = [];
  for (const c of citations) {
    const url = String(c);
    // mju.ac.kr 이 mjc.ac.kr 을 포함하지 않도록 호스트 기준으로 판정한다
    let host = '';
    try { host = new URL(url).hostname; } catch { host = url; }
    if (host.endsWith(ALLOWED_DOMAIN)) kept.push(url);
    else removed.push(url);
  }
  return { kept, removed };
}

/** 도메인이 명지전문대인지 판정 */
export function isAllowedSource(url) {
  try {
    return new URL(url).hostname.endsWith(ALLOWED_DOMAIN);
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
