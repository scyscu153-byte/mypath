/**
 * 출처 URL 실검증 (Vercel Serverless Function)
 * ─────────────────────────────────────────────────────────
 * P0-1. "형식만 mjc.ac.kr 인 URL"과 "지금 실제로 열리는 페이지"는 다르다.
 *
 * 실제 테스트에서 원문 보기 링크가 "요청하신 자료를 찾을 수 없습니다"를 띄웠다.
 * 도메인 필터는 통과했지만 페이지가 없는 경우다.
 *
 * ★ 브라우저에서 직접 확인할 수 없다.
 *   mjc.ac.kr 은 CORS 를 허용하지 않으므로 fetch 가 차단된다.
 *   그래서 서버에서 대신 열어 보고 결과만 돌려준다.
 *
 * ★ 이 함수는 AI 를 호출하지 않는다. 크레딧을 쓰지 않는다.
 *   단순 HTTP 요청이므로 데모 키와 무관하며, api/gateway.js 와 완전히 분리돼 있다.
 *
 * 판정
 *   verified   실제로 열리고, 제목의 핵심어가 페이지에서 확인됨  → 기본 추천
 *   unverified 열리기는 하는데 제목을 확인하지 못함 / 시간 초과   → "확인 필요"로 표시
 *   broken     404·5xx·접속 불가 / 리다이렉트 후 도메인 이탈      → 추천에서 제외
 */

const ALLOWED_DOMAIN = 'mjc.ac.kr';

/** 한 URL 당 대기 상한. 시연 중 전체가 느려지면 안 된다.
 *  학교 게시판 한 페이지가 350KB 안팎이라 여유를 둔다. */
const FETCH_TIMEOUT_MS = 9000;

/** 한 번에 검증할 수 있는 최대 개수 */
const MAX_ITEMS = 20;

/** 동시 요청 수 — 학교 서버를 몰아치지 않기 위해 제한한다 */
const CONCURRENCY = 5;

/**
 * 200 을 돌려주면서 본문에 "없는 자료"라고 적는 페이지가 있다.
 * 상태 코드만 믿으면 안 된다.
 */
const NOT_FOUND_MARKERS = [
  '요청하신 자료를 찾을 수 없습니다',
  '요청하신 페이지를 찾을 수 없습니다',
  '존재하지 않는 게시물',
  '삭제되었거나',
  '페이지를 찾을 수 없습니다',
  '잘못된 접근입니다',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다' });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  const items = Array.isArray(body?.items) ? body.items.slice(0, MAX_ITEMS) : null;
  if (!items) {
    return res.status(400).json({ error: 'items 배열이 필요합니다' });
  }

  const results = await mapLimit(items, CONCURRENCY, (it) =>
    verifyOne(String(it?.url || ''), String(it?.title || '')),
  );

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    checkedAt: new Date().toISOString(),
    results,
  });
}

/** @returns {Promise<{url:string, status:'verified'|'unverified'|'broken', httpStatus:number|null, finalUrl:string|null, error:string|null}>} */
async function verifyOne(url, title) {
  const out = (status, extra = {}) => ({
    url, status, httpStatus: null, finalUrl: null, bytesRead: null, error: null, ...extra,
  });

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return out('broken', { error: 'URL 형식이 올바르지 않습니다' });
  }
  if (!isAllowedHost(parsed.hostname)) {
    return out('broken', { error: `허용되지 않은 도메인: ${parsed.hostname}` });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const r = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // 일부 학교 페이지가 기본 UA 를 거부한다
        'User-Agent': 'Mozilla/5.0 (compatible; CareerBridgeMJC/1.0; +https://mypath-gules.vercel.app)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const finalUrl = r.url || url;
    const httpStatus = r.status;

    if (!r.ok) {
      return out('broken', { httpStatus, finalUrl, error: `HTTP ${httpStatus}` });
    }

    // 리다이렉트로 학교 밖(또는 명지대)으로 나갔는지 다시 본다
    let finalHost = '';
    try { finalHost = new URL(finalUrl).hostname; } catch { /* 무시 */ }
    if (finalHost && !isAllowedHost(finalHost)) {
      return out('broken', { httpStatus, finalUrl, error: `리다이렉트 후 도메인 이탈: ${finalHost}` });
    }

    const html = await readSome(r);
    // 진단용 — "못 읽은 것"과 "읽었는데 제목이 없는 것"은 원인이 다르다
    const bytesRead = html.length;

    // 200 이지만 "자료 없음" 페이지인 경우
    const text = stripTags(html);
    if (NOT_FOUND_MARKERS.some((m) => text.includes(m))) {
      return out('broken', { httpStatus, finalUrl, bytesRead, error: '페이지가 자료 없음을 표시함' });
    }

    // 제목의 핵심어가 페이지에 있는지
    if (titleMatches(title, text, html)) {
      return out('verified', { httpStatus, finalUrl, bytesRead });
    }
    return out('unverified', {
      httpStatus, finalUrl, bytesRead,
      error: '페이지에서 프로그램 제목을 확인하지 못함',
    });
  } catch (e) {
    const aborted = e?.name === 'AbortError';
    return out(
      // 시간 초과는 "없는 페이지"가 아니다. 단정하지 않고 확인 필요로 둔다.
      aborted ? 'unverified' : 'broken',
      { error: aborted ? `응답 시간 초과 (${FETCH_TIMEOUT_MS}ms)` : String(e?.message || e) },
    );
  } finally {
    clearTimeout(timer);
  }
}

function isAllowedHost(host) {
  const h = String(host || '').toLowerCase();
  return h === ALLOWED_DOMAIN || h.endsWith(`.${ALLOWED_DOMAIN}`);
}

/**
 * 본문을 읽되 상한을 둔다.
 *
 * ★ 처음엔 300KB 로 잡았다가 전부 unverified 가 나왔다.
 *   mjc.ac.kr 게시판 페이지가 349KB 이고, 정작 게시글 제목은 그 뒤쪽에 있다.
 *   머리말·네비게이션 HTML 이 앞부분을 다 차지한다.
 *   상한이 본문에 닿지 못하면 "제목을 확인하지 못함"이 되어버린다.
 */
async function readSome(res, limitBytes = 1_500_000) {
  const reader = res.body?.getReader?.();
  if (!reader) return await res.text();

  const chunks = [];
  let total = 0;
  while (total < limitBytes) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  try { reader.cancel(); } catch { /* 무시 */ }

  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return new TextDecoder('utf-8', { fatal: false }).decode(merged);
}

function stripTags(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * 제목이 페이지에 있는지 확인한다.
 * 제목 전체가 그대로 있는 경우는 드물다(줄바꿈·대괄호·공백 차이).
 * 그래서 ★핵심 낱말★ 기준으로 본다 — 절반 이상 나오면 같은 페이지로 인정한다.
 */
function titleMatches(title, text, html) {
  const words = String(title)
    .replace(/[[\]()·,~\-—/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 8);

  if (!words.length) return false;

  const hay = `${text} ${(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')}`;
  const hit = words.filter((w) => hay.includes(w)).length;
  return hit / words.length >= 0.5;
}

/** 동시 실행 수를 제한한 map */
async function mapLimit(list, limit, fn) {
  const out = new Array(list.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
    while (i < list.length) {
      const idx = i++;
      out[idx] = await fn(list[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
