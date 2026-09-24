/* 核对库里 user（615:1737）节点带不带变换（dashboard-1 那次的教训），并核对 vb 落位。
   导出矢量按 none / mirrorX / mirrorY / rot180 渲成 16px，与 Figma 画布渲染逐像素比覆盖率。
   rot90 由包围盒长宽比排除（11.5 × 12.9006 转置后对不上）。 */
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

const dir = new URL('./', import.meta.url);
const src = readFileSync(new URL('user.svg', dir), 'utf8');
const inner = src.replace(/[\s\S]*?(<path)/, '$1').replace(/<\/svg>\s*$/, '');
const VB = process.env.VB || '-2.25 -1.5497 16 16';
const W = 11.5; const H = 12.9006;

const xforms = {
  none: '',
  mirrorX: `translate(${W} 0) scale(-1 1)`,
  mirrorY: `translate(0 ${H}) scale(1 -1)`,
  rot180: `translate(${W} ${H}) scale(-1 -1)`,
};

const canvas = coverage(readFileSync(new URL('canvas.png', dir)));
for (const [k, tf] of Object.entries(xforms)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${VB}" fill="none">`
    + (tf ? `<g transform="${tf}">${inner}</g>` : inner) + '</svg>';
  const png = new Resvg(svg, {}).render().asPng();
  if (k === 'none') writeFileSync(new URL('render_none.png', dir), png);
  const r = coverage(png);
  let err = 0;
  for (let i = 0; i < r.length; i++) err += Math.abs(r[i] - canvas[i]);
  console.log(k.padEnd(8), 'mean |Δcoverage| =', (err / r.length).toFixed(4));
}
