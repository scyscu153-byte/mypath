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

    // 포스터 이미지. 이미 받아둔 HTML 에서 꺼내므로 ★추가 요청도 지연도 없다.★
    const poster = extractPoster(html, finalUrl);

    // 제목의 핵심어가 페이지에 있는지
    if (titleMatches(title, text, html)) {
      return out('verified', { httpStatus, finalUrl, bytesRead, poster });
    }
    return out('unverified', {
      httpStatus, finalUrl, bytesRead, poster,
      error: '페이지는 열리지만 프로그램 제목을 확인하지 못했습니다',
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

// ─────────────────────────────────────────────
//  포스터 이미지 추출
//
//  교내 공지의 상당수는 본문이 ★포스터 이미지 한 장★이다.
//  (수집 143건 중 14%는 본문 글자가 30자도 안 된다 — 포스터만 올린 것이다)
//  제목만으로는 무슨 프로그램인지 감이 안 오는 경우가 많아 읽는 데 도움이 된다.
//
//  ★이미 받아둔 HTML 에서 꺼낸다 — 추가 요청도, 지연도 없다.★
//
//  주의: 학교 페이지에는 로고·아이콘·버튼·1픽셀 투명 이미지가 잔뜩 있다.
//  그걸 포스터로 착각하면 카드마다 학교 로고가 붙는 우스운 화면이 된다.
// ─────────────────────────────────────────────

/**
 * ★차단 목록이 아니라 허용 목록으로 간다.★
 *
 * 처음에는 "로고·아이콘처럼 생긴 것을 빼자"는 차단 방식으로 짰다가 실패했다.
 * 실제 페이지 12건으로 시험하니 6건에서 포스터를 "찾았는데" 전부 같은 URL —
 *   /ibuilder/comp/layout1/skin/thema01/bbs/images/0102.png
 * 게시판 스킨 장식 이미지였다. 경로에 /bbs 가 들어 있어 첨부로 오인한 것이다.
 * 그대로 내보냈으면 ★모든 카드에 똑같은 템플릿 이미지가 붙었을 것이다.★
 *
 * 학교 페이지를 뜯어보니 신호가 분명했다. 본문에 실제로 올린 이미지는
 *   https://mjcms.mjc.ac.kr/crosseditor/binary/images/000261/2026...jpg
 * 처럼 에디터 업로드 경로에 있고, 나머지는 전부 템플릿·배너·아이콘이다.
 *
 * 그래서 "업로드된 본문 이미지"만 받는다. 못 찾으면 안 그리면 그만이다.
 * ★애매하면 버린다 — 엉뚱한 이미지를 붙이는 것보다 없는 편이 낫다.★
 */
const UPLOADED_IMAGE_PATH = [
  '/crosseditor/binary/images/',   // 학교 CMS 에디터 (가장 확실한 신호)
  '/userfiles/', '/userfile/',
  '/upload/', '/uploads/', '/upfile/',
  '/attach/', '/attachfile/',
];

/** 확실히 껍데기인 경로 — 허용 목록을 통과해도 여기 걸리면 버린다 */
const CHROME_PATH = [
  '/ibuilder/', '/resource/', '/skin/', '/template/', '/theme',
  '/common/', '/layout',
];

export function extractPoster(html, baseUrl) {
  const src = pickPosterSrc(html);
  if (!src) return null;

  // 상대 경로를 절대 주소로. 학교 도메인 밖이면 버린다.
  let abs;
  try {
    abs = new URL(src, baseUrl);
  } catch {
    return null;
  }
  if (abs.protocol !== 'https:' && abs.protocol !== 'http:') return null;
  if (!isAllowedHost(abs.hostname)) return null;

  // 화면에서는 https 로만 띄운다 (배포본이 https 라 http 이미지는 어차피 차단된다)
  abs.protocol = 'https:';
  return abs.href;
}

function pickPosterSrc(html) {
  const imgs = [...html.matchAll(/<img[^>]+>/gi)].map((m) => m[0]);

  for (const tag of imgs) {
    const src = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (!isUploadedImage(src)) continue;

    // width/height 가 명시돼 있고 작으면 본문 이미지라도 아이콘이다
    const w = Number(tag.match(/\bwidth=["']?(\d+)/i)?.[1] || 0);
    const h = Number(tag.match(/\bheight=["']?(\d+)/i)?.[1] || 0);
    if ((w && w < 150) || (h && h < 150)) continue;

    return src;
  }
  return null;
}

/** 사람이 본문에 올린 이미지인가 (허용 목록) */
function isUploadedImage(src) {
  const s = String(src || '').toLowerCase();
  if (!s || s.startsWith('data:')) return false;
  if (/\.(svg|gif)(\?|$)/.test(s)) return false;                 // 대개 아이콘·애니메이션
  if (CHROME_PATH.some((p) => s.includes(p))) return false;      // 템플릿·배너
  return UPLOADED_IMAGE_PATH.some((p) => s.includes(p));
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
function titleWords(title) {
  return String(title)
    .replace(/[[\]()·,~\-—/]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 8);
}

function titleMatches(title, text, html) {
  const words = titleWords(title);
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
