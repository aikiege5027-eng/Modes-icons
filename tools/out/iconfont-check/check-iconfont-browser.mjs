/* iconfont 的真实浏览器核对：同一个图标用字体（fillText）和原 SVG（drawImage）各画一次，
   256px 画布逐像素比，报每个图标的平均灰度差与墨迹重心偏移。
   ⚠ 阈值的来历：Chrome（macOS）画文字时会把边缘略微加粗，每条边多出固定零点几个像素，
   所以差异与尺寸成反比 —— 实测 64px 全部在 4~5%、256px 降到 1% 上下，形状本身没有问题。
   真正画错（镂空被填实）的量级是 30% 以上（构建脚本的反向测试里是 35.76%），
   所以 256px 下取 2% 足够把两者分开；重心偏移再卡 1px，防止整体错位被平均差掩盖。build-iconfont.mjs 用 resvg 比过几何，
   这一步补的是「浏览器真的把字体按非零规则、按设计的位置画出来了」（基线、上下留白、码位都对）。
   跑法：先在仓库根目录起 python3 -m http.server 8080，再 node tools/out/iconfont-check/check-iconfont-browser.mjs */
import { spawn } from 'node:child_process';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9361;
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, '--user-data-dir=/tmp/icf-prof', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let t; for (let i = 0; i < 50 && !t; i++) { await sleep(200); try { t = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((x) => x.type === 'page'); } catch {} }
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise((r) => ws.addEventListener('open', r));
let id = 0; const p = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && p.has(m.id)) { p.get(m.id)(m.result); p.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; p.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'http://127.0.0.1:8080/assets/iconfont/demo.html' });
await sleep(1500);
const expr = `(async () => {
  await document.fonts.load('64px "kone-icons"');
  const S = 256, out = [];
  const css = [...document.styleSheets].flatMap((s) => [...s.cssRules]).filter((r) => r.selectorText && /::before$/.test(r.selectorText));
  for (const sym of document.querySelectorAll('symbol')) {
    const rule = css.find((r) => r.selectorText === '.' + sym.id + '::before');
    const ch = JSON.parse(rule.style.content);
    const a = new OffscreenCanvas(S, S).getContext('2d'), b = new OffscreenCanvas(S, S).getContext('2d');
    a.fillStyle = '#fff'; a.fillRect(0, 0, S, S); a.fillStyle = '#000'; a.font = S + 'px "kone-icons"'; a.textBaseline = 'alphabetic';
    a.fillText(ch, 0, S * 14 / 16);   // 基线在画框 y=14（字体 ascender 14 / descender 2）
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + sym.getAttribute('viewBox') + '" width="' + S + '" height="' + S + '" color="#000">' + sym.innerHTML + '</svg>';
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await img.decode();
    b.fillStyle = '#fff'; b.fillRect(0, 0, S, S); b.drawImage(img, 0, 0, S, S);
    const A = a.getImageData(0, 0, S, S).data, B = b.getImageData(0, 0, S, S).data;
    let sum = 0, ink = 0, ax = 0, ay = 0, aw = 0, bx = 0, by = 0, bw = 0;
    for (let i = 0; i < A.length; i += 4) {
      const x = (i / 4) % S, y = Math.floor(i / 4 / S), wa = (255 - A[i]) / 255, wb = (255 - B[i]) / 255;
      sum += Math.abs(A[i] - B[i]); ink += wb;
      ax += wa * x; ay += wa * y; aw += wa; bx += wb * x; by += wb * y; bw += wb;
    }
    out.push([sym.id, sum / 255 / (S * S), ink, Math.hypot(ax / aw - bx / bw, ay / aw - by / bw)]);
  }
  return JSON.stringify(out);
})()`;
const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
ws.close(); chrome.kill();
const rows = JSON.parse(r.result.value).sort((x, y) => y[1] - x[1]);
const MAX = 0.02;        // 平均灰度差上限
/* 墨迹重心偏移上限 2px（256px 画布上 = 1/8 网格单位）。
   文字加粗对不对称的图标会把重心推一点：实测最大是 alarm 0.95px、user-talk 0.80px。
   真正的错位（码位对错图、基线算错）至少是 1 个网格单位 = 16px，2px 留足余量又分得开。 */
const MAX_SHIFT = 2;
const bad = rows.filter((x) => x[1] > MAX || x[2] < 1 || x[3] > MAX_SHIFT);
console.log(`真实 Chrome · 字体 vs SVG（256px）· ${rows.length} 个图标 · 重心偏移最大 ${Math.max(...rows.map((x) => x[3])).toFixed(2)}px`);
rows.slice(0, 5).forEach(([c, d, , sh]) => console.log(`  ${c.padEnd(42)} ${(d * 100).toFixed(2)}% · 偏移 ${sh.toFixed(2)}px`));
console.log(bad.length ? `\n${bad.length} 个不通过：${bad.map((x) => x[0]).join(', ')}` : `\n全部在 ${MAX * 100}% 以内，iconfont 浏览器核对通过`);
process.exitCode = bad.length ? 1 : 0;
