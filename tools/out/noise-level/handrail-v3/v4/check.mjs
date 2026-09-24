/* 第四版（设计把图形从 12 单位加宽到 14 单位）的取图与核对，做三件事：
     1. 判方向：两个节点导出的矢量仍然逐字节相同，左右差在节点级变换 ——
        把导出矢量按 none / mirrorX / mirrorY / rot180 渲成 16px，分别与左右画布比墨量。
     2. 定 vb：frame 的 metadata 取不到 vector 的 x/y，所以在 ±2 单位内按 0.25 步长
        扫 dx/dy 与画布拟合，取最优。
     3. 核尺寸：量墨迹长边，确认真的是 14 单位（上一版是 12.12），
        以及换算到 20px 显示框后的渲染长边。
   用法：cd tools/out/noise-level/handrail-v3/v4 && node check.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');
const init = require('pathkit-wasm/bin/pathkit.js');
const wasmBinary = readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm'));
const PathKit = await init({ wasmBinary });

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

const src = readFileSync(new URL('./right.svg', import.meta.url), 'utf8');
const d = (src.match(/ d="([^"]*)"/) || [])[1];
const W = Number((src.match(/ width="([\d.]+)"/) || [])[1]);
const H = Number((src.match(/ height="([\d.]+)"/) || [])[1]);
console.log(`导出矢量的紧包围盒 ${W} × ${H}（上一版是 12 × 11）`);
{
  const p = PathKit.FromSVGString(d);
  const b = p.getBounds();
  p.delete();
  const long = Math.max(b.fRight - b.fLeft, b.fBottom - b.fTop);
  console.log(`实测墨迹长边 ${long.toFixed(2)} 单位 → 16px 框内 ${(long / 16 * 16).toFixed(1)}px`
    + ` / 20px 框内 ${(long / 16 * 20).toFixed(1)}px`);
}

const xforms = {
  none: '',
  mirrorX: `translate(${W} 0) scale(-1 1)`,
  mirrorY: `translate(0 ${H}) scale(1 -1)`,
  rot180: `translate(${W} ${H}) scale(-1 -1)`,
};
const render = (tf, vb) => {
  const inner = tf ? `<g transform="${tf}"><path d="${d}" fill="#141414" fill-rule="evenodd"/></g>`
    : `<path d="${d}" fill="#141414" fill-rule="evenodd"/>`;
  return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${vb}" fill="none">${inner}</svg>`, {}).render().asPng();
};
const errOf = (cov, vb, tf) => {
  const r = coverage(render(tf, vb));
  let e = 0;
  for (let i = 0; i < r.length; i++) e += Math.abs(r[i] - cov[i]);
  return e / r.length;
};
const canvas = {
  left: coverage(readFileSync(new URL('./left-canvas.png', import.meta.url))),
  right: coverage(readFileSync(new URL('./right-canvas.png', import.meta.url))),
};
/* 先按居中定个起点，再扫偏移 */
const centered = `${-(16 - W) / 2} ${-(16 - H) / 2} 16 16`;
console.log(`\n方向判定（vb 先用居中的 ${centered}）`);
for (const side of ['right', 'left']) {
  const out = Object.entries(xforms)
    .map(([k, tf]) => [k, errOf(canvas[side], centered, tf)])
    .sort((a, b) => a[1] - b[1]);
  console.log('  ' + side.padEnd(6) + out.map(([k, e]) => k + ' ' + e.toFixed(4)).join('  ') + '   → ' + out[0][0]);
}
let best = null;
for (let dx = -2; dx <= 2.0001; dx += 0.25) {
  for (let dy = -2; dy <= 2.0001; dy += 0.25) {
    const vb = `${(-(16 - W) / 2 + dx).toFixed(4)} ${(-(16 - H) / 2 + dy).toFixed(4)} 16 16`;
    const e = errOf(canvas.right, vb, '');
    if (!best || e < best.e) best = { e, vb };
  }
}
const [vx, vy] = best.vb.split(' ').map(Number);
console.log(`\nvb 扫描（以右 / none 为基准）最优 ${best.vb}  误差 ${best.e.toFixed(4)}`);
console.log(`  → vector 在 16 画框里摆在 x ${(-vx).toFixed(2)} y ${(-vy).toFixed(2)}`
  + `（左右各留 ${(-vx).toFixed(2)} / ${(16 + vx - W).toFixed(2)}，上下 ${(-vy).toFixed(2)} / ${(16 + vy - H).toFixed(2)}）`);
console.log(`  左 / mirrorX 用同一个 vb 的误差 ${errOf(canvas.left, best.vb, xforms.mirrorX).toFixed(4)}`);
/* fill-rule 是否可省 */
const rule = (r) => new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${best.vb}"><path d="${d}" fill="#141414" fill-rule="${r}"/></svg>`, {}).render().asPng();
console.log(`  nonzero 与 evenodd 渲染${rule('nonzero').equals(rule('evenodd')) ? '一致（fill-rule 可省）' : '不一致（必须保留 fill-rule）'}`);
writeFileSync(new URL('./best-vb.txt', import.meta.url), best.vb + '\n');
/* 大图备查 */
for (const [k, tf] of Object.entries({ right_none: '', left_mirrorX: xforms.mirrorX })) {
  const inner = tf ? `<g transform="${tf}"><path d="${d}" fill="#141414" fill-rule="evenodd"/></g>`
    : `<path d="${d}" fill="#141414" fill-rule="evenodd"/>`;
  writeFileSync(new URL(`./big_${k}.png`, import.meta.url),
    new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="${best.vb}" fill="none">${inner}</svg>`, {}).render().asPng());
}
process.exit(0);
