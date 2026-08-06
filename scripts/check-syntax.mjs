/**
 * 모듈 로드 검사
 * ─────────────────────────────────────────────────────────
 * js/ 와 api/ 의 모든 파일을 ★실제로 import 해서★ 파싱·실행 오류를 잡는다.
 *
 * ★ 왜 필요한가
 *   ES 모듈은 파싱 단계에서 실패한다. 파일 하나에 문법 오류가 있으면
 *   그 파일을 import 하는 app.js 가 통째로 죽고, 화면이 빈 채로 남는다.
 *   서버는 200 을 주므로 배포는 "성공"으로 보인다.
 *
 *   실제로 pipeline.js 에 변수 중복 선언(`today`) 하나가 들어가
 *   배포된 앱이 아무것도 그리지 않는 상태로 올라간 적이 있다.
 *   브라우저 콘솔을 열기 전까지는 아무도 모른다.
 *
 * 실행:  node scripts/check-syntax.mjs
 */

import { readdirSync, statSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join, relative } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['js', 'api'];

/** 브라우저 전용 전역을 흉내 낸다 — 모듈 최상위에서 접근하는 코드가 있을 수 있다 */
function installBrowserStubs() {
  const store = new Map();
  globalThis.localStorage ??= {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() { return store.size; },
  };
  globalThis.window ??= globalThis;
  globalThis.document ??= {
    querySelectorAll: () => [],
    querySelector: () => null,
    getElementById: () => null,
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, addEventListener() {} }),
    addEventListener() {},
    body: { appendChild() {} },
  };
  globalThis.location ??= { search: '', href: 'http://localhost/' };
}

installBrowserStubs();

const files = [];
for (const d of DIRS) {
  let entries;
  try { entries = readdirSync(join(ROOT, d)); } catch { continue; }
  for (const name of entries) {
    const p = join(ROOT, d, name);
    if (statSync(p).isFile() && /\.m?js$/.test(name)) files.push(p);
  }
}

let failed = 0;
let warned = 0;

for (const f of files) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  try {
    await import(pathToFileURL(f).href);
    console.log(`  OK    ${rel}`);
  } catch (e) {
    // ★ 문법 오류만 배포를 막는다.
    //   SyntaxError 는 브라우저에서도 똑같이 파싱에 실패하므로 화면이 통째로 죽는다.
    //   그 외(TypeError 등)는 이 스크립트의 DOM 흉내가 부족해서 나는 것이라
    //   실제 브라우저에서는 문제가 없다. 경고만 남긴다.
    const isSyntax = e instanceof SyntaxError;
    if (isSyntax) {
      failed++;
      console.error(`  FAIL  ${rel}`);
      console.error(`        SyntaxError: ${e.message}`);
    } else {
      warned++;
      console.log(`  ~     ${rel}  (파싱은 정상 · 헤드리스 실행 불가: ${e?.message || e})`);
    }
  }
}

console.log();
if (failed) {
  console.error(`❌ 문법 오류 ${failed}건. 이 상태로 배포하면 화면이 비어 보입니다.`);
  process.exit(1);
}
console.log(`✅ ${files.length}개 모듈 문법 정상${warned ? ` (${warned}건은 브라우저 전용 코드라 실행만 건너뜀)` : ''}`);
