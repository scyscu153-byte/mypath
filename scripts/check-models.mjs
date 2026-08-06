/**
 * 모델 목록 정합 검사
 * ─────────────────────────────────────────────────────────
 * js/gateway.js 가 실제로 호출하는 모델이
 * api/gateway.js 의 허용 목록(ALLOWED_MODELS)에 전부 들어 있는지 확인한다.
 *
 * ★ 왜 필요한가
 *   본인 키로 쓸 때는 브라우저가 게이트웨이를 직접 부르므로 허용 목록을 지나지 않는다.
 *   그래서 목록이 어긋나도 ★로컬에서 본인 키로 테스트하면 아무 문제가 없어 보인다.★
 *   키 없이 들어온 사람(=심사위원)에게만 400 이 나고, 그때는 이미 늦다.
 *   실제로 모델을 교체한 날 이 불일치가 생겼다.
 *
 * 실행:  node scripts/check-models.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const client = readFileSync(join(ROOT, 'js/gateway.js'), 'utf8');
const server = readFileSync(join(ROOT, 'api/gateway.js'), 'utf8');

/** 블록 하나를 잘라낸다 */
function section(src, startMark, endMark) {
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error(`찾을 수 없음: ${startMark}`);
  const b = src.indexOf(endMark, a);
  return src.slice(a, b);
}

/** 따옴표 안의 모델 이름만 뽑는다 */
function modelNames(block) {
  return [...block.matchAll(/'([a-zA-Z0-9._/-]+)'/g)]
    .map((m) => m[1])
    .filter((n) => n.includes('-') || n.includes('/'));
}

const used = new Set([
  ...modelNames(section(client, 'const ROUTE = Object.freeze({', '});')),
  ...modelNames(section(client, 'export const PERSONA_MODEL = Object.freeze({', '});')),
]);

const allowed = new Set(
  modelNames(section(server, 'const ALLOWED_MODELS = new Set([', '])')),
);

const missing = [...used].filter((m) => !allowed.has(m));
const extra = [...allowed].filter((m) => !used.has(m));

console.log('클라이언트가 호출하는 모델 :', [...used].join(', '));
console.log('프록시 허용 목록           :', [...allowed].join(', '));
console.log();

if (missing.length) {
  console.error('❌ 허용 목록에 없는 모델이 있습니다 — 데모 모드에서 400 이 납니다:');
  missing.forEach((m) => console.error(`     ${m}`));
  console.error('\n   api/gateway.js 의 ALLOWED_MODELS 에 추가하세요.');
  process.exit(1);
}

console.log('✅ 클라이언트가 호출하는 모델이 전부 허용 목록에 있습니다');
if (extra.length) {
  console.log('ℹ️  허용돼 있으나 현재 쓰지 않는 모델:', extra.join(', '));
}
