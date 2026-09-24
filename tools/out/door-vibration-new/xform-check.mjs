/* 核对三张轿门振动图标的节点带不带变换（dashboard-1 那次的教训），并核对 vb 的落位：
   导出矢量按 none / mirrorX / mirrorY / rot180 渲成 16px，与 Figma 画布渲染逐像素比覆盖率。
   rot90 不在候选里 —— 它会交换包围盒长宽，三张的长宽比都对不上，已排除。 */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');

function coverage(buf) {
  let off = 8; let w = 0; let h = 0; let colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9];
      if (data[8] !== 8 || data[12] !== 0) throw new Error('unsupported PNG');
    } else if (type === 'IDAT') idat.push(Buffer.from(data));
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
    let lum; let alpha;
    if (ch === 4) { lum = (out[i * 4] + out[i * 4 + 1] + out[i * 4 + 2]) / 3; alpha = out[i * 4 + 3]; }
    else if (ch === 3) { lum = (out[i * 3] + out[i * 3 + 1] + out[i * 3 + 2]) / 3; alpha = 255; }
    else if (ch === 2) { lum = out[i * 2]; alpha = out[i * 2 + 1]; }
    else { lum = out[i]; alpha = 255; }
    cov[i] = (alpha / 255) * (1 - lum / 255);
  }
  return cov;
}

const ICONS = [
  { key: 'lateral', node: '8457:23064', zh: '横向', vb: '-1 -3 16 16', w: 13.9902, h: 9.98047 },
  { key: 'longitudinal', node: '8457:23065', zh: '纵向', vb: '-1 -3 16 16', w: 13.9902, h: 9.98047 },
  { key: 'vertical', node: '8457:23066', zh: '垂直', vb: '-2 -1 16 16', w: 12, h: 13.9805 },
];

for (const ic of ICONS) {
  const src = readFileSync(new URL('./' + ic.key + '.svg', import.meta.url), 'utf8');
  const inner = src.replace(/[\s\S]*?<g id="Union">/, '<g id="Union">').replace(/<\/svg>\s*$/, '');
  const canvas = coverage(readFileSync(new URL('./' + ic.key + '_canvas.png', import.meta.url)));
  const xforms = {
    none: '',
    mirrorX: `translate(${ic.w} 0) scale(-1 1)`,
    mirrorY: `translate(0 ${ic.h}) scale(1 -1)`,
    rot180: `translate(${ic.w} ${ic.h}) scale(-1 -1)`,
  };
  const out = [];
  for (const [k, tf] of Object.entries(xforms)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${ic.vb}" fill="none">`
      + (tf ? `<g transform="${tf}">${inner}</g>` : inner) + '</svg>';
    const png = new Resvg(svg, {}).render().asPng();
    if (k === 'none') writeFileSync(new URL('./' + ic.key + '_render.png', import.meta.url), png);
    const r = coverage(png);
    let err = 0;
    for (let i = 0; i < r.length; i++) err += Math.abs(r[i] - canvas[i]);
    out.push(k + ' ' + (err / r.length).toFixed(4));
  }
  console.log(ic.zh.padEnd(3), ic.node.padEnd(12), 'vb ' + ic.vb.padEnd(12), out.join('  '));
}
