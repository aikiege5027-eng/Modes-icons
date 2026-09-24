/* relevel 与 relevel-slow 是相邻两行，换成新版后两张图的构图几乎一样
   （同一组箭头、同一条中线，只差竖杆是连续还是断开），所以必须量一下
   「20px 下还分得开吗」，不能只靠肉眼看 120px 放大图。

   量法：把两张图都按 20px 渲染，算逐像素墨量的平均绝对差（0~1）。
   这个口径本项目用过：扶手带那次量出
     click 与它自己水平镜像  0.2240
     click 与 thermometer    0.1821
   当时的结论是「0.18 这个量级已经算两张不同的图」。
   同时把**旧版那一对**（TDesign align-vertical vs align-bottom）也量出来当基线 ——
   要回答的不是「新版这一对像不像」，而是「新版这一对比旧版那一对更难分还是更好分」。
   用法：cd tools/out/std-v2 && node pair-check.mjs */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

function coverage(buf) {
  let off = 8; let w = 0; let h = 0; let colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9]; }
    else if (type === 'IDAT') idat.push(Buffer.from(data));
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType];
  const stride = w * ch;
  const out = Buffer.alloc(h * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const cur = Buffer.alloc(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0; const b = prev[x]; const c = x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) {
        const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[x] = v & 0xff;
    }
    cur.copy(out, y * stride); prev = cur;
  }
  const cov = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const alpha = ch === 4 ? out[i * 4 + 3] : ch === 2 ? out[i * 2 + 1] : 255;
    const lum = ch >= 3 ? (out[i * ch] + out[i * ch + 1] + out[i * ch + 2]) / 3 : out[i * ch];
    cov[i] = (alpha / 255) * (1 - lum / 255);
  }
  return cov;
}

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const pick = (k) => JSON.parse(dom.window.eval(`JSON.stringify(STD_ICONS.${k})`));

const SIZE = 20;
const render = ({ vb, svg }) => coverage(new Resvg(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="${vb}" fill="none">`
  + svg.replace(/currentColor/g, '#141414') + '</svg>', {}).render().asPng());

const diff = (a, b) => {
  let e = 0;
  for (let i = 0; i < a.length; i++) e += Math.abs(a[i] - b[i]);
  return e / a.length;
};

const newSlow = { vb: '0 0 16 16', svg: readFileSync(new URL('./relevel_slow-inline.txt', import.meta.url), 'utf8').trim() };
const relevel = pick('relevel');
/* ⚠️ 旧版基线必须写死在这里，不能 pick('relevel_slow') ——
   新版已经落进 index.html 了，再从页面读就变成「新版对自己」，两个数字会一起塌成 0.0072 / 0.0000，
   这条基线也就没了意义。下面这条是被换掉的那版：TDesign align-bottom 走流水线改造的单条 path
   （底线 + 一根长下箭头），配方归档在 tools/icons.config.mjs 的 TDESIGN_ARCHIVE。 */
const oldSlow = {
  vb: '0 0 16 16',
  svg: '<path id="Union" d="M9 11L11.1 8.2L11.9 8.8L9.2 12.4C9.02587 12.6322 8.79913 12.7582 8.51976 12.778C8.24039 12.79787 7.9981 12.7052 7.79289 12.5L4.14645 8.85355L4.85355 8.14645L8 11.2929L8 1.5L9 1.5L9 11ZM14.5 15L1.5 15L1.5 14L14.5 14L14.5 15Z" fill="currentColor"/>',
};

const pairs = [
  ['新版 relevel-slow  vs  已落库 relevel', newSlow, relevel],
  ['旧版 relevel-slow  vs  已落库 relevel', oldSlow, relevel],
  ['新版 relevel-slow  vs  旧版 relevel-slow', newSlow, oldSlow],
];
console.log(`${SIZE}px 下的逐像素墨量平均绝对差（越大越容易分开）`);
for (const [label, a, b] of pairs) {
  console.log('  ' + label.padEnd(38) + diff(render(a), render(b)).toFixed(4));
}
console.log('  参考基线：click vs 自身镜像 0.2240 / click vs thermometer 0.1821（扶手带那次量的）');
dom.window.close();
process.exit(0);
