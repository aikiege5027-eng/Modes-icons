/* 量一下标准版图标名在 12px 系统字体下的实际墨迹宽度，用来核对 .std-mode-group 的 76px
   够不够。resvg 用系统字体栅格化，量的是渲染后墨迹的左右极值。 */
import { createRequire } from 'node:module';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const { Resvg } = require('@resvg/resvg-js');

function inkWidth(png) {
  let off = 8; let w = 0; let h = 0; let colorType = 0; const idat = [];
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString('ascii', off + 4, off + 8);
    const data = png.subarray(off + 8, off + 8 + len);
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
  let minX = w; let maxX = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const alpha = ch === 4 ? out[i * 4 + 3] : 255;
      const lum = ch === 4 ? out[i * 4] : out[i * ch];
      if ((alpha / 255) * (1 - lum / 255) > 0.05) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
    }
  }
  return maxX < 0 ? 0 : maxX - minX + 1;
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
for (const s of ['vibration-Horizonta', 'vibration-', 'Horizonta', 'vibration-vertical', 'vertical', '横向振动', '垂直振动']) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="40">`
    + `<text x="10" y="26" font-family="${FONT}" font-size="12" font-weight="400" fill="#000">${s}</text></svg>`;
  const png = new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng();
  console.log(String(inkWidth(png)).padStart(4) + 'px  ' + s);
}
