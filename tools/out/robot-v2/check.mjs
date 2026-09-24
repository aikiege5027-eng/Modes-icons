/* 「模式图标」表 自动引导 的标准版换成设计新画的 Robot（IOT Delivery 12007:216383）。
   这支脚本做四件事：
     1. 剥掉导出里那个铺满画框的白底 rect —— 只留 <g id="Robot_2"> 里的 6 条 path。
        （bias 那次也踩过：节点导出会带底色 / 画板矩形，照搬会得到一个白方块压住图形。）
     2. 确认坐标系：这份导出的根 svg 就是 16×16 / viewBox 0 0 16 16（因为有那个铺满的 rect），
        也就是**画框坐标**，所以 vb 直接用 0 0 16 16，不需要像紧包围盒那样算居中偏移。
        用画布 PNG 逐像素拟合验证。
     3. 核对节点带不带旋转镜像（none / mirrorX / mirrorY / rot180 四种拟合画布）。
     4. 量墨迹长边（单位 / 16px 框 / 20px 框），与库内那批比一眼大小。
   用法：cd tools/out/robot-v2 && node check.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');
const init = require('pathkit-wasm/bin/pathkit.js');
const PathKit = await init({ wasmBinary: readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm')) });

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

const raw = readFileSync(new URL('./robot.svg', import.meta.url), 'utf8');
/* 只取 <g id="Robot_2"> 那一层：外层 <g id="Robot"> 里还有一个铺满画框的白底 rect */
const glyph = (raw.match(/<g id="Robot_2">([\s\S]*?)<\/g>\s*<\/g>/) || [])[1];
if (!glyph) throw new Error('没找到 <g id="Robot_2">');
if (/<rect/.test(glyph)) throw new Error('内层还残留 rect，检查剥离逻辑');
const inline = glyph.replace(/\n\s*/g, '').replace(/fill="#141414"/g, 'fill="currentColor"').trim();
writeFileSync(new URL('./robot-inline.txt', import.meta.url), inline + '\n');
console.log('剥离后 path 条数 ' + (inline.match(/<path/g) || []).length
  + '，其中带 fill-rule="evenodd" 的 ' + (inline.match(/fill-rule="evenodd"/g) || []).length + ' 条');

const body = inline.replace(/currentColor/g, '#141414');
const xforms = { none: '', mirrorX: 'translate(16 0) scale(-1 1)', mirrorY: 'translate(0 16) scale(1 -1)', rot180: 'translate(16 16) scale(-1 -1)' };
const canvas = coverage(readFileSync(new URL('./canvas.png', import.meta.url)));
const out = [];
for (const [k, tf] of Object.entries(xforms)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">`
    + (tf ? `<g transform="${tf}">${body}</g>` : body) + '</svg>';
  const png = new Resvg(svg, {}).render().asPng();
  if (k === 'none') writeFileSync(new URL('./render_none.png', import.meta.url), png);
  const r = coverage(png);
  let e = 0;
  for (let i = 0; i < r.length; i++) e += Math.abs(r[i] - canvas[i]);
  out.push([k, e / r.length]);
}
out.sort((a, b) => a[1] - b[1]);
console.log('vb 0 0 16 16 下的四种变换拟合画布：' + out.map(([k, e]) => k + ' ' + e.toFixed(4)).join('  '));
console.log('  → 最贴合 ' + out[0][0] + (out[0][1] < 0.02 ? '（误差在本文件其他对得上的案例同一量级）' : ''));

/* 墨迹长边 */
const ds = [...inline.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
const p = PathKit.FromSVGString(ds.join(' '));
const b = p.getBounds();
p.delete();
const long = Math.max(b.fRight - b.fLeft, b.fBottom - b.fTop);
console.log(`墨迹包围盒 ${(b.fRight - b.fLeft).toFixed(2)} × ${(b.fBottom - b.fTop).toFixed(2)}`
  + `（x ${b.fLeft.toFixed(2)}~${b.fRight.toFixed(2)} / y ${b.fTop.toFixed(2)}~${b.fBottom.toFixed(2)}）`);
console.log(`长边 ${long.toFixed(2)} 单位 → 16px 框 ${long.toFixed(1)}px / 20px 框 ${(long / 16 * 20).toFixed(1)}px`);

/* nonzero 与 evenodd 是否等价（这批 path 里有 evenodd，看能不能省） */
const rule = (r) => new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 16 16">`
  + body.replace(/fill-rule="evenodd"/g, `fill-rule="${r}"`) + '</svg>', {}).render().asPng();
console.log('把 evenodd 换成 nonzero 后渲染' + (rule('nonzero').equals(rule('evenodd')) ? '一致（可省）' : '不一致（必须保留 evenodd）'));
process.exit(0);
