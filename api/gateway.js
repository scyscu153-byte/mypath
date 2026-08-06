/**
 * 팩트챗 게이트웨이 프록시 (Vercel Serverless Function)
 * ─────────────────────────────────────────────────────────
 * 브라우저는 게이트웨이를 직접 호출하지 않고 이 함수를 거친다.
 *
 * ★ 이 함수는 데모 모드 전용이다. 사용자의 키를 받지 않는다.
 *
 *   사용자가 자기 키를 입력한 경우, 브라우저가 게이트웨이를 ★직접★ 호출한다
 *   (js/gateway.js 참조). 그 경로는 이 서버를 거치지 않으므로,
 *   우리는 남의 키를 볼 수 있는 위치에 있지 않다.
 *
 *   이 함수는 오직 DEMO_API_KEY(서버 환경변수)만 사용한다.
 *   사용자 키를 받는 코드가 아예 없다는 것이 그 보장이다.
 *
 * ⚠️ DEMO_API_KEY 를 설정하면 누구나 우리 크레딧을 쓸 수 있게 된다.
 *    시연 직전에만 설정하고, 평소에는 비워둔다.
 */

const BASE_URL = process.env.FACTCHAT_BASE_URL
  || 'https://factchat-cloud.mindlogic.ai/v1/gateway';

/**
 * 허용 모델 화이트리스트.
 * 프록시가 열려 있으므로, 비싼 모델을 임의로 호출당하지 않도록 제한한다.
 * (claude-opus-5 는 1회 52.94 크레딧 — 의도적으로 제외)
 *
 * ⚠️ js/gateway.js 의 ROUTE / PERSONA_MODEL 과 반드시 같이 고쳐야 한다.
 *    여기에 없는 모델을 쓰면 데모 모드에서만 400 이 난다.
 *    본인 키 경로는 게이트웨이를 직접 부르므로 이 검사를 지나지 않아,
 *    로컬에서 본인 키로 테스트하면 이 불일치가 드러나지 않는다.
 */
const ALLOWED_MODELS = new Set([
  'solar-pro2',            //  0.15 크레딧 / 2.2초  — 시장 트렌드 관점 (Upstage)
  'gemini-3.5-flash-lite', //  0.33 크레딧 / 1.8초  — 비용·시간 관점 (Google)
  'gpt-5.4-nano',          //  1.0  크레딧 / 2.0초  — 작업 분류용
  'gpt-5.4-mini',          //  1.99 크레딧 / 2.8초  — 갭 분석 · 실무 관점 (OpenAI)
  'claude-sonnet-5',       //  8.0  크레딧 / 6.0초  — 학업 연계 관점 (Anthropic)
  'sonar-pro',             // 21~35 크레딧 / 5~35초 — 실시간 검색
]);

/** 응답 길이 상한 — 크레딧 폭주 방지 */
const MAX_TOKENS_CAP = 4000;

/** 게이트웨이 자체 응답 대기 상한 (ms). sonar-pro 실측 최대 35초. */
const UPSTREAM_TIMEOUT_MS = 55_000;

// ─────────────────────────────────────────────
//  크레딧 방어 — 이 주소는 공개다
//
//  저장소가 Public 이므로 /api/gateway 주소도 공개다.
//  데모 키는 학생 한 명에게 배정된 월 10,000 크레딧에서 나가고,
//  파이프라인 1회 실행이 약 68크레딧이다 (= 약 146회면 소진).
//  막지 않으면 URL 이 퍼진 날 하루로 끝난다.
//
//  ⚠️ 이 카운터는 서버 인스턴스 메모리에 있다. 인스턴스가 재활용되면 초기화된다.
//     완전한 방어가 아니라 ★비용을 올리는 속도 방지턱★이다.
//     정확한 총량 제어가 필요하면 외부 저장소가 필요하다 — 대회 범위를 넘는다.
// ─────────────────────────────────────────────

/** 파이프라인 1회 = 7호출. 한 사람이 10분에 3회 정도는 돌려볼 수 있게 둔다. */
const PER_IP_LIMIT = 25;
const PER_IP_WINDOW_MS = 10 * 60 * 1000;

/** 전체 상한 — 한 시간에 파이프라인 약 25회분 */
const GLOBAL_LIMIT = 180;
const GLOBAL_WINDOW_MS = 60 * 60 * 1000;

const ipHits = new Map();   // ip -> number[] (호출 시각)
let globalHits = [];        // number[]

function withinWindow(list, windowMs, now) {
  return list.filter((t) => now - t < windowMs);
}

/** @returns {{ok: true} | {ok: false, scope: string, retryAfter: number}} */
function checkRate(ip) {
  const now = Date.now();

  globalHits = withinWindow(globalHits, GLOBAL_WINDOW_MS, now);
  if (globalHits.length >= GLOBAL_LIMIT) {
    return { ok: false, scope: 'global', retryAfter: Math.ceil(GLOBAL_WINDOW_MS / 1000) };
  }

  const mine = withinWindow(ipHits.get(ip) || [], PER_IP_WINDOW_MS, now);
  if (mine.length >= PER_IP_LIMIT) {
    return { ok: false, scope: 'ip', retryAfter: Math.ceil(PER_IP_WINDOW_MS / 1000) };
  }

  mine.push(now);
  ipHits.set(ip, mine);
  globalHits.push(now);

  // Map 이 무한정 자라지 않게 가끔 청소한다
  if (ipHits.size > 500) {
    for (const [k, v] of ipHits) {
      if (withinWindow(v, PER_IP_WINDOW_MS, now).length === 0) ipHits.delete(k);
    }
  }
  return { ok: true };
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다' });
  }

  // ── 1. 키 ───────────────────────────────────
  // ★ 서버의 데모 키만 사용한다. 요청 헤더에서 키를 읽지 않는다.
  //   사용자 키는 브라우저가 게이트웨이를 직접 호출하는 경로로 처리되며,
  //   이 함수를 거치지 않는다.
  const key = process.env.DEMO_API_KEY;

  if (!key) {
    return res.status(401).json({
      error: '데모 모드가 비활성화되어 있습니다',
      hint: '팩트챗(mjc.factchat.bot) → API Gateway 에서 본인 키를 발급받아 입력하세요. '
          + '입력하신 키는 저희 서버를 거치지 않고 브라우저에서 직접 사용됩니다.',
    });
  }

  // ── 1-2. 사용량 제한 ────────────────────────
  const rate = checkRate(clientIp(req));
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return res.status(429).json({
      error: rate.scope === 'global'
        ? '데모 모드 사용량이 한도에 도달했습니다'
        : '요청이 너무 잦습니다',
      hint: '본인의 팩트챗 키를 입력하면 제한 없이 사용할 수 있습니다. '
          + '입력한 키는 저희 서버를 거치지 않고 브라우저에서 직접 사용됩니다.',
    });
  }

  // ── 2. 요청 검증 ────────────────────────────
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body) {
    return res.status(400).json({ error: '요청 본문을 해석할 수 없습니다' });
  }

  const { endpoint = 'chat/completions', ...payload } = body;

  // 크레딧 조회는 본문 없이 GET 으로 처리
  if (endpoint === 'credits') {
    return forwardCredits(key, res);
  }

  if (!ALLOWED_MODELS.has(payload.model)) {
    return res.status(400).json({
      error: `허용되지 않은 모델입니다: ${payload.model}`,
      allowed: [...ALLOWED_MODELS],
    });
  }

  // 응답 길이 상한을 강제한다 (클라이언트가 더 크게 보내도 잘라낸다)
  if (!payload.max_tokens || payload.max_tokens > MAX_TOKENS_CAP) {
    payload.max_tokens = MAX_TOKENS_CAP;
  }

  // ── 3. 게이트웨이로 전달 ────────────────────
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(`${BASE_URL}/${endpoint}/`, {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // 프록시 응답은 캐시하지 않는다 — 캐싱은 클라이언트(js/gateway.js)가 담당
    res.setHeader('Cache-Control', 'no-store');
    return res.send(text);
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: '게이트웨이 응답이 시간 내에 오지 않았습니다',
        hint: 'sonar-pro 검색은 최대 35초가 걸립니다. 잠시 후 다시 시도하세요',
      });
    }
    return res.status(502).json({ error: '게이트웨이 호출 실패', detail: String(err) });
  } finally {
    clearTimeout(timer);
  }
}

/** 크레딧 잔량 조회 — GET 이라 별도 처리 */
async function forwardCredits(key, res) {
  try {
    const upstream = await fetch(`${BASE_URL}/credits/`, {
      headers: { 'x-api-key': key },
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(text);
  } catch (err) {
    return res.status(502).json({ error: '크레딧 조회 실패', detail: String(err) });
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
