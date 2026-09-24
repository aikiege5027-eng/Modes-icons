/* 「靠水平镜像区分左 / 右扶手带」这个做法在 16px 下到底分不分得出来？量一下，别凭感觉。
   做法：把库内 click（标准版这一列现在用的那张）按 16px 渲一次、镜像再渲一次，
   逐像素比「墨量差」；再拿两组已知明显不同的图做标尺（click vs thermometer、
   click vs Water droplets），看镜像那一对的差值处在什么量级。
   用法：cd tools/out/noise-level && node mirror-legibility.mjs */
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
    const lum = ch >= 3 ? (out[i * ch] + out[i * ch + 1] + out[i * ch + 2]) / 3 : out[i * ch];
    const alpha = ch === 4 ? out[i * 4 + 3] : ch === 2 ? out[i * 2 + 1] : 255;
    cov[i] = (alpha / 255) * (1 - lum / 255);
  }
  return cov;
}

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const icon = (k) => dom.window.eval('JSON.stringify(LIVE_STD_ICONS.' + k + ')');

const render = (def, mirror) => {
  const o = JSON.parse(def);
  /* 镜像绕 16 画框中心翻，与「把同一张图水平翻转当另一个方向用」的做法一致 */
  const inner = mirror
    ? `<g transform="translate(16 0) scale(-1 1)">${o.svg}</g>`
    : o.svg;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${o.vb}" fill="none">`
    + inner.replace(/currentColor/g, '#141414') + '</svg>';
  return coverage(new Resvg(svg, {}).render().asPng());
};
const diff = (a, b) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
};

const click = render(icon('click'), false);
const clickMirror = render(icon('click'), true);
const thermometer = render(icon('thermometer'), false);
const droplets = render(icon('waterDroplets'), false);

console.log('16px 下的墨量差（平均 |Δcoverage|，越小越难分辨）');
console.log('  click vs 它自己的水平镜像      ' + diff(click, clickMirror).toFixed(4) + '  ← 左 / 右扶手现在的区分方式');
console.log('  click vs thermometer         ' + diff(click, thermometer).toFixed(4) + '  ← 标尺：两张明显不同的图');
console.log('  click vs Water droplets      ' + diff(click, droplets).toFixed(4) + '  ← 标尺');
dom.window.close();
process.exit(0);
