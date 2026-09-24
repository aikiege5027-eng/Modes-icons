/* 设计重画的第三版（左 12003:216335 / 右 12003:216319）的取图与核对。
   ⚠️ 最要紧的一条：两个节点 download_assets 导出的矢量**逐字节相同**（都是 1158 字节、
   同一条 d）。所以左右不是两张图，而是同一张图 + 节点级变换 —— 这正是本项目踩过两次的坑
   （dashboard-1 612:930 带 −180° 旋转，导出与 612:929 完全一样）。
   导出不带变换，所以必须拿**画布渲染**来判断每一侧到底是哪个方向。
   做法：把导出矢量按 none / mirrorX / mirrorY / rot180 四种渲成 16px，
   分别与左、右两个节点的画布 PNG 逐像素比墨量，各取误差最小的那一种。
   用法：cd tools/out/noise-level/handrail-v3 && node check.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../../package.json', import.meta.url));
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

const src = readFileSync(new URL('./left-c.svg', import.meta.url), 'utf8');
const d = (src.match(/ d="([^"]*)"/) || [])[1];
const W = 12; const H = 11;
/* 12×11 的紧包围盒放进 16 画框：设计在 Figma 里的实际摆放要看画布，
   先按「居中」算一版 vb，再用四种变换分别与左 / 右画布比，一起定下来。 */
const vbCentered = `${-(16 - W) / 2} ${-(16 - H) / 2} 16 16`;
const xforms = {
  none: '',
  mirrorX: `translate(${W} 0) scale(-1 1)`,
  mirrorY: `translate(0 ${H}) scale(1 -1)`,
  rot180: `translate(${W} ${H}) scale(-1 -1)`,
};
const render = (tf, vb) => {
  const inner = tf ? `<g transform="${tf}">${'<path d="' + d + '" fill="#141414" fill-rule="evenodd"/>'}</g>`
    : `<path d="${d}" fill="#141414" fill-rule="evenodd"/>`;
  return new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${vb}" fill="none">${inner}</svg>`, {}).render().asPng();
};
for (const side of ['left', 'right']) {
  const canvas = coverage(readFileSync(new URL(`./${side}-canvas.png`, import.meta.url)));
  const out = [];
  for (const [k, tf] of Object.entries(xforms)) {
    const png = render(tf, vbCentered);
    writeFileSync(new URL(`./${side}_${k}.png`, import.meta.url), png);
    const r = coverage(png);
    let err = 0;
    for (let i = 0; i < r.length; i++) err += Math.abs(r[i] - canvas[i]);
    out.push([k, err / r.length]);
  }
  out.sort((a, b) => a[1] - b[1]);
  console.log(side.padEnd(6) + 'vb ' + vbCentered + '  ' + out.map(([k, e]) => k + ' ' + e.toFixed(4)).join('  '));
  console.log('      → 最贴合：' + out[0][0]);
}
/* 96px 大图，看构造 */
for (const [k, tf] of Object.entries({ none: '', mirrorX: xforms.mirrorX })) {
  const inner = tf ? `<g transform="${tf}"><path d="${d}" fill="#141414" fill-rule="evenodd"/></g>`
    : `<path d="${d}" fill="#141414" fill-rule="evenodd"/>`;
  writeFileSync(new URL(`./big_${k}.png`, import.meta.url),
    new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="${vbCentered}" fill="none">${inner}</svg>`, {}).render().asPng());
}
console.log('写出 big_none.png / big_mirrorX.png 与各变换的 16px 渲图');

/* 上面「居中」那版 vb 的误差 0.08 偏大（本项目里对得上的案例通常在 0.01 量级），
   说明设计在 16 画框里的实际摆放不是居中。frame 的 get_metadata 没返回子节点，
   拿不到 vector 的 x/y，所以这里直接扫一遍偏移求最优：
   以「右 = 导出原样」为基准，在 ±2 单位内按 0.25 步长扫 vb 的 dx / dy，
   取与画布最贴合的那一组。左边再用同一个 vb + mirrorX 复核。 */
{
  const canvasR = coverage(readFileSync(new URL('./right-canvas.png', import.meta.url)));
  const canvasL = coverage(readFileSync(new URL('./left-canvas.png', import.meta.url)));
  const errOf = (cov, vb, tf) => {
    const r = coverage(render(tf, vb));
    let e = 0;
    for (let i = 0; i < r.length; i++) e += Math.abs(r[i] - cov[i]);
    return e / r.length;
  };
  let best = null;
  for (let dx = -2; dx <= 2.0001; dx += 0.25) {
    for (let dy = -2; dy <= 2.0001; dy += 0.25) {
      const vb = `${(-(16 - W) / 2 + dx).toFixed(4)} ${(-(16 - H) / 2 + dy).toFixed(4)} 16 16`;
      const e = errOf(canvasR, vb, '');
      if (!best || e < best.e) best = { e, vb, dx, dy };
    }
  }
  console.log(`\n扫描结果（右 / none）最优 vb ${best.vb}  误差 ${best.e.toFixed(4)}`
    + `  相对居中的偏移 dx ${best.dx} dy ${best.dy}`);
  console.log(`左 / mirrorX 用同一个 vb 的误差 ${errOf(canvasL, best.vb, xforms.mirrorX).toFixed(4)}`);
  /* 反推 vector 在 frame 里的位置：vb 的 -x 就是 vector 的 x */
  const [vx, vy] = best.vb.split(' ').map(Number);
  console.log(`→ 反推 vector 在 16 画框里的摆放：x ${(-vx).toFixed(4)}  y ${(-vy).toFixed(4)}`
    + `（宽高 ${W}×${H}，右边距 ${(16 + vx - W).toFixed(4)}，下边距 ${(16 + vy - H).toFixed(4)}）`);
  writeFileSync(new URL('./best-vb.txt', import.meta.url), best.vb + '\n');
}
