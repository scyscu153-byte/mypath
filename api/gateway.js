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

/**
 * 게이트웨이 자체 응답 대기 상한 (ms).
 *
 * ★35초로 줄였다가 되돌렸다. 그 값이 실패의 원인이었다.★
 *
 *   원래 55초였는데, 브라우저가 3회 재시도하면 최악 167초가 되어
 *   시연 슬롯의 절반이 멈춘 스피너로 사라진다는 이유로 35초까지 잘랐다.
 *   그런데 167초의 진짜 원인은 ★5xx 재시도★였고 그건 __noRetry 로 따로 막았다.
 *   타임아웃 축소는 멀쩡한 검색을 잘라내는 일만 했다.
 *
 *   실측(2026-08-07, 10회): 성공 6 / 실패 4.
 *   실패 4건 중 3건이 ★35.2 · 35.3초★에 504 로 끊겼다 — 이 상한에 정확히 붙어 있다.
 *   sonar-pro 는 "최대 35초"가 아니라 그보다 오래 걸리는 경우가 있다.
 *
 * 예산을 층층이 맞춘다. 안쪽이 항상 먼저 끝나야 한다:
 *   상류 대기 50초  <  브라우저 대기 58초  <  Vercel maxDuration 60초
 * 이 순서가 어긋나면 누가 먼저 포기했는지 알 수 없는 오류가 난다.
 */
const UPSTREAM_TIMEOUT_MS = 50_000;

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

/**
 * 파이프라인 1회 = 8호출 (목표 제안 1 + 요구역량 1 + 갭 1 + 검색 1 + 페르소나 4).
 *
 * ★ 25로 두면 안 된다.
 *   심사장은 한 회의실의 공용 Wi-Fi다 — 심사위원 세 명이 ★같은 공인 IP★로 보인다.
 *   한 명이 3~5분씩 최대 3회면 9사이클 = 72호출. 25는 3사이클째에 이미 막힌다.
 *   그리고 막히면 app.js 가 429를 보고 ★API 키 입력 패널★을 띄운다.
 *   심사위원에게는 키가 없다. 시연이 그 자리에서 끝난다.
 *
 *   비용 상한은 아래 GLOBAL_LIMIT 이 잡는다. 이 값은 "한 사람이 폭주하는 것"만 막으면 된다.
 */
const PER_IP_LIMIT = 120;   // = 15사이클 / 10분
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

  // ── 2. 요청 검증 ────────────────────────────
  //
  // ★사용량 계산보다 ★먼저★ 검증한다.★
  //   전에는 순서가 반대였다. 그러면 ★거부될 쓰레기 요청도 한도를 갉아먹는다.★
  //   허용되지 않은 모델이나 과도한 본문처럼 크레딧이 1도 안 나가는 요청을
  //   180번 보내기만 하면 전체 한도가 한 시간 동안 소진되고,
  //   그 상태에서 심사위원이 누르면 화면에 API 키 입력 패널이 뜬다.
  //   ★비용이 나가는 요청만 세는 것이 맞다.★
  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body) {
    return res.status(400).json({ error: '요청 본문을 해석할 수 없습니다' });
  }

  const { endpoint = 'chat/completions', ...payload } = body;

  // endpoint 는 클라이언트가 준 값이라 그대로 URL 에 이어붙이면 안 된다.
  // 호스트는 못 바꾸지만, 데모 키가 실린 요청을 게이트웨이의 임의 경로로 보낼 수 있다.
  //
  // ★크레딧 조회(credits)는 여기서 뺐다.★
  //   데모 키는 ★팀원 개인 계정★의 키다. credits 는 그 계정의
  //   quota·used·remaining 을 그대로 돌려주는데,
  //     · 아무나 부를 수 있고 (로그인 없음)
  //     · 아래 사용량 제한보다 ★먼저★ 반환돼서 횟수 제한도 안 걸리고
  //     · 정작 앱은 이 경로를 쓰지 않는다 (자기 키가 있을 때만 게이트웨이로 직접 조회)
  //   쓰지도 않는 길을 열어 두고 남의 계정 상태를 공개할 이유가 없다.
  if (endpoint !== 'chat/completions') {
    return res.status(400).json({ error: '허용되지 않은 경로입니다' });
  }

  // ★ 입력 크기 상한.
  //   max_tokens 는 ★출력★만 자른다. 입력은 여기서 막지 않으면
  //   Vercel 본문 한도(4.5MB)까지 밀어넣을 수 있고, 호출당 크레딧이 그만큼 커진다.
  //   사용량 제한을 호출 ★횟수★로만 세고 있으므로 이게 없으면 증폭기가 된다.
  //   실제 파이프라인의 최대 프롬프트는 4KB 수준이다.
  const inputSize = JSON.stringify(payload.messages ?? '').length;
  if (inputSize > 20_000) {
    return res.status(413).json({ error: '요청이 너무 큽니다' });
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

  // ── 2-2. 사용량 제한 ────────────────────────
  //   여기까지 왔다는 것은 ★실제로 크레딧이 나갈 요청★이라는 뜻이다.
  //   검증에서 거부되는 요청은 세지 않는다 (위 주석 참조).
  const rate = checkRate(clientIp(req));
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfter));
    return res.status(429).json({
      error: rate.scope === 'global'
        ? '데모 모드 사용량이 한도에 도달했습니다'
        : '요청이 너무 잦습니다',
      // ★"제한 없이"는 사실이 아니다.★ 본인 키에도 월 10,000 크레딧 한도가 있다.
      //   여기서 없어지는 것은 ★이 데모 서버가 건 호출 제한★뿐이다.
      //   둘을 뭉뚱그리면 "내 키를 넣으면 공짜로 무한"이라는 오해가 남는다.
      hint: '데모 모드는 여러 사람이 키 하나를 나눠 쓰기 때문에 호출 제한이 있습니다. '
          + '본인의 팩트챗 키(재학생 월 10,000 크레딧)를 입력하면 이 제한 없이 본인 몫만큼 쓸 수 있고, '
          + '입력한 키는 저희 서버를 거치지 않고 브라우저에서 직접 사용됩니다.',
    });
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
      // ★안내 문구에 상한을 숫자로 박아두지 않는다.★
      //   전에 "최대 35초"라고 적어뒀는데 상한을 50초로 올린 뒤에도 문구가 그대로여서,
      //   화면이 실제와 다른 숫자를 말하고 있었다. 상수에서 계산한다.
      return res.status(504).json({
        error: `실시간 검색이 ${UPSTREAM_TIMEOUT_MS / 1000}초 안에 끝나지 않았습니다`,
        hint: '외부 검색이 평소보다 오래 걸리고 있습니다. 다시 시도하면 대개 됩니다',
      });
    }
    return res.status(502).json({ error: '게이트웨이 호출 실패', detail: String(err) });
  } finally {
    clearTimeout(timer);
  }
}

function safeParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}
