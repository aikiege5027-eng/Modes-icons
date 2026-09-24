/* 上面那支 xform-check 给 level-sensing 报了 0.0241 的误差（比 door-vibration 那三张的
   0.001 量级大一档），而四种变换的误差完全相同 —— 说明差的不是方向。这支脚本把
   「画布渲染」与「按 vb 渲出来的」两张 16×16 逐行打成字符图，看差在哪。
   用法：node diff-dump.mjs */
import { readFileSync } from 'node:fs';
import zlib from 'node:zlib';

function coverage(buf) {
  let off = 8; let w = 0; let h = 0; let colorType = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9];
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
  return { cov, w, h };
}

const ramp = ' .:-=+*#%@';
const glyph = (v) => ramp[Math.min(9, Math.max(0, Math.round(v * 9)))];

for (const pair of [
  ['平层感应', 'levelsensing_canvas.png', 'level-sensing_render_both.png'],
  ['噪音', 'megaphone_canvas.png', 'megaphone_render_placed.png'],
]) {
  const [zh, aFile, bFile] = pair;
  const a = coverage(readFileSync(new URL('./' + aFile, import.meta.url)));
  const b = coverage(readFileSync(new URL('./' + bFile, import.meta.url)));
  console.log('\n=== ' + zh + '  左 画布(' + aFile + ')  中 渲染(' + bFile + ')  右 差值');
  for (let y = 0; y < a.h; y++) {
    let l = ''; let m = ''; let d = '';
    for (let x = 0; x < a.w; x++) {
      const i = y * a.w + x;
      l += glyph(a.cov[i]); m += glyph(b.cov[i]); d += glyph(Math.abs(a.cov[i] - b.cov[i]));
    }
    console.log(l + ' | ' + m + ' | ' + d);
  }
  let err = 0; let ia = 0; let ib = 0;
  for (let i = 0; i < a.cov.length; i++) { err += Math.abs(a.cov[i] - b.cov[i]); ia += a.cov[i]; ib += b.cov[i]; }
  console.log('墨量 画布 ' + ia.toFixed(2) + '  渲染 ' + ib.toFixed(2)
    + '  平均|Δ| ' + (err / a.cov.length).toFixed(4) + '  总|Δ| ' + err.toFixed(2) + 'px');
}
