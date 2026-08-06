/**
 * 보고서 PDF 렌더 — 쪽번호를 넣기 위해 CDP 를 쓴다
 * ─────────────────────────────────────────────────────────
 *   1) chrome --headless --remote-debugging-port=9222 --user-data-dir=<임시> about:blank
 *   2) (HTML 이 있는 폴더에서) python -m http.server 8899
 *   3) node scripts/render-report.mjs http://localhost:8899/<파일>.html <출력>.pdf
 *
 * ★왜 --print-to-pdf 를 안 쓰는가.★
 * 그 옵션은 푸터에 ★파일 경로를 통째로 박아 넣는다★ —
 * 제출본 54쪽 전부에 file:///C:/Users/<이름>/... 이 찍힌다.
 * --no-pdf-header-footer 로 끄면 쪽번호까지 같이 사라진다.
 * 쪽번호 없는 54쪽 문서는 "8.5.4를 보세요"라고 적어도 찾을 수가 없다.
 * 그래서 CDP 의 Page.printToPDF 로 템플릿을 직접 준다.
 */

import { writeFileSync } from 'node:fs';

const [,, targetUrl, outPath] = process.argv;
const list = await (await fetch('http://127.0.0.1:9222/json/list')).json();
const page = list.find(t => t.type === 'page');
if (!page) { console.error('페이지를 못 찾음'); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((res, rej) => {
  const n = ++id;
  pending.set(n, { res, rej });
  ws.send(JSON.stringify({ id: n, method, params }));
});

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    const { res, rej } = pending.get(m.id); pending.delete(m.id);
    m.error ? rej(new Error(m.error.message)) : res(m.result);
  }
};

await new Promise(r => ws.onopen = r);
await send('Page.enable');
await send('Page.navigate', { url: targetUrl });
// Mermaid 7개가 그려질 시간을 준다
await new Promise(r => setTimeout(r, 14000));

const { data } = await send('Page.printToPDF', {
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',                    // 머리글은 비운다 (날짜 안 찍음)
  footerTemplate: `<div style="width:100%;font-size:8.5pt;color:#667085;
      font-family:'Malgun Gothic',sans-serif;text-align:center;margin:0 12mm;">
      <span class="pageNumber"></span> / <span class="totalPages"></span>
    </div>`,
  marginTop: 0.55, marginBottom: 0.55, marginLeft: 0, marginRight: 0,
  preferCSSPageSize: false,
  paperWidth: 8.27, paperHeight: 11.69,             // A4
});
writeFileSync(outPath, Buffer.from(data, 'base64'));
console.log('  저장:', outPath);
ws.close();
