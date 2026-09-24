/* 核对「扶手带这张图在放大后有没有跟着等比放大」。
   结论是会 —— 本页的放大不是在 Figma 里改 frame 尺寸，而是 SVG viewBox 撑满 CSS 盒子：
   路径坐标一个都不动，viewBox 是 16 单位、盒子给多大就按比例铺多大，
   所以 Figma 里那个子元素有没有勾 Constraints → Scale 与本页渲染无关
   （那条约束只在「在 Figma 里拉动 frame」时起作用）。
   这里用实测把它钉死：把页面里存的那条 path 分别渲进 16px 与 20px 的框，
   量墨迹的实际像素范围，看比值是不是正好 1.25。
   顺带拿一个库内图标（layers）做对照，两者行为应当完全一样。
   用法：cd tools/out/noise-level/handrail-v3 && node scale-proof.mjs */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

function inkBox(buf) {
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
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const alpha = ch === 4 ? out[i * 4 + 3] : ch === 2 ? out[i * 2 + 1] : 255;
      const lum = ch >= 3 ? (out[i * ch] + out[i * ch + 1] + out[i * ch + 2]) / 3 : out[i * ch];
      if ((alpha / 255) * (1 - lum / 255) > 0.05) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return { w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

const html = readFileSync(new URL('../../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const get = (k) => JSON.parse(dom.window.eval('JSON.stringify(LIVE_STD_ICONS.' + k + ')'));

console.log('图标'.padEnd(22) + '16px 框内墨迹   20px 框内墨迹   比值');
for (const key of ['handrailLeft', 'handrailRight', 'layers', 'elevatorDoorClosing2']) {
  const icon = get(key);
  const box = (px) => inkBox(new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${icon.vb}" fill="none">`
    + icon.svg.replace(/currentColor/g, '#141414') + '</svg>', {},
  ).render().asPng());
  const a = box(16); const b = box(20);
  console.log((icon.name + ' (' + key + ')').padEnd(22)
    + `${a.w}×${a.h}`.padEnd(16) + `${b.w}×${b.h}`.padEnd(16)
    + (b.w / a.w).toFixed(3) + ' / ' + (b.h / a.h).toFixed(3));
}
console.log('\n（理论值 1.25；上面是 16 / 20px 原寸，抗锯齿边界让取整误差有 ±1px，所以比值散在 1.14~1.40）');
/* 把两档都放大 10 倍再量一遍 —— 取整误差被摊薄到 0.1px 量级，比值应当收敛到 1.250 */
console.log('\n同样两档、各放大 10 倍后再量（误差摊薄）');
console.log('图标'.padEnd(22) + '160px 墨迹      200px 墨迹      比值');
for (const key of ['handrailLeft', 'handrailRight', 'layers', 'elevatorDoorClosing2']) {
  const icon = get(key);
  const box = (px) => inkBox(new Resvg(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${icon.vb}" fill="none">`
    + icon.svg.replace(/currentColor/g, '#141414') + '</svg>', {},
  ).render().asPng());
  const a = box(160); const b = box(200);
  console.log((icon.name + ' (' + key + ')').padEnd(22)
    + `${a.w}×${a.h}`.padEnd(16) + `${b.w}×${b.h}`.padEnd(16)
    + (b.w / a.w).toFixed(3) + ' / ' + (b.h / a.h).toFixed(3));
}
dom.window.close();
process.exit(0);
