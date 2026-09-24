/* 16px vs 20px 的像素级对照：同一批图标各渲两遍，再用 Chrome 以 image-rendering: pixelated
   放大 8 倍（浏览器做最近邻，不做平滑），这样能直接看出「16 网格撑到 20px = 线宽 1.25px」
   被抗锯齿抹出的半灰边。
   为什么不用 resvg 自己放大：resvg 的缩放是平滑的，放大后看不出像素落位。
   用法：cd tools/out/noise-level && node size-compare.mjs  → 写出 size-compare.html
   然后用 Chrome --screenshot 拍它。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const pick = (expr) => JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

/* 挑五个代表：带 1px 门中缝的、纯斜线的、带指针的、新交付的手、堆叠线条的 */
const SAMPLES = [
  ['elevator-door-closing2', 'LIVE_STD_ICONS.elevatorDoorClosing2'],
  ['bias（一条斜线）', 'LIVE_STD_ICONS.bias'],
  ['dashboard-1（指针）', 'LIVE_STD_ICONS.dashboard1'],
  ['右扶手带温度（新交付）', 'LIVE_STD_ICONS.handrailRight'],
  ['layers（三层堆叠）', 'LIVE_STD_ICONS.layers'],
];
const ZOOM = 8;
const cells = SAMPLES.map(([label, expr]) => {
  const icon = pick(expr);
  const png = (px) => new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${icon.vb}" fill="none">`
    + icon.svg.replace(/currentColor/g, '#141414') + '</svg>', {},
  ).render().asPng().toString('base64');
  const img = (px) => `<img alt="" width="${px * ZOOM}" height="${px * ZOOM}" src="data:image/png;base64,${png(px)}">`;
  return `<div class="cell">
    <div class="pair"><div><div class="tag">16px（原）</div>${img(16)}</div>
                      <div><div class="tag">20px（现）</div>${img(20)}</div></div>
    <div class="name">${label}</div></div>`;
}).join('');

writeFileSync(new URL('./size-compare.html', import.meta.url), `<!doctype html>
<meta charset="utf-8">
<style>
  body { margin: 0; padding: 24px; background: #fff;
         font: 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #141414; }
  h1 { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
  p.note { color: #676a72; margin: 0 0 20px; }
  .row { display: flex; gap: 28px; flex-wrap: wrap; row-gap: 28px; max-width: 1080px; }
  .cell { text-align: center; }
  .pair { display: flex; gap: 12px; align-items: flex-end; }
  .tag { color: #676a72; font-size: 11px; margin-bottom: 4px; }
  img { image-rendering: pixelated; border: 1px solid #dfe1e8; background: #fff; }
  .name { margin-top: 8px; color: #141414; }
</style>
<h1>标准版图标 16px → 20px（放大 ${ZOOM} 倍看像素，最近邻）</h1>
<p class="note">图标是按 16 网格、线宽恒 1 画的。撑到 20px 后 1 单位 = 1.25px，笔画落在半像素上，边缘出现半灰边。</p>
<div class="row">${cells}</div>
`);
console.log('写出 size-compare.html');
dom.window.close();
process.exit(0);
