/* 核对这一轮新取的两张标准版图标：
     megaphone      Design Token China 612:1028（噪音）
     level-sensing  IOT Delivery      8261:20794（平层感应，vector 8261:20808）
   两件事一起核：
     1. 节点带不带旋转 / 镜像 —— 导出矢量按 none / mirrorX / mirrorY / rot180 渲成 16px，
        与 Figma 画布渲染（get_screenshot，16×16 原生）逐像素比覆盖率，取误差最小的那一种。
        rot90 不在候选里：它交换包围盒长宽，两张的长宽比都对不上（14.4×10.54 / 14×14
        —— 后者虽然是正方，但图形本身上下有平层线、左右没有，转 90° 观感完全不同，
        靠下面的 none 与 rot180 的误差差值也能看出来）。
     2. vb 的落位 —— 「紧包围盒居中进 16 画框」与「Figma 里的实际摆放」两种算法各渲一次，
        谁拟合画布更好用谁。megaphone 两者不同（居中 -0.8/-2.73 vs 实际 -1/-3.1027），
        level-sensing 两者恰好相同（-1 -1），只留一条。
   用法：node xform-check.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');

/* 与 door-vibration-new/xform-check.mjs 同一份 coverage()：把 PNG 解成
   「每像素的墨量」（alpha × 暗度），这样描边色不同也能比。 */
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
  {
    key: 'megaphone', file: 'megaphone', canvas: 'megaphone_canvas',
    node: '612:1028', zh: '噪音', w: 14.4, h: 10.5398,
    /* 居中：-(16-14.4)/2 = -0.8 / -(16-10.5398)/2 = -2.7301
       实际：symbol 里 vector 在 x1 y3.1027026176452637 */
    vbs: { centered: '-0.8 -2.7301 16 16', placed: '-1 -3.1027 16 16' },
  },
  {
    key: 'level-sensing', file: 'level-sensing', canvas: 'levelsensing_canvas',
    node: '8261:20794', zh: '平层感应', w: 14, h: 14,
    /* 居中 -(16-14)/2 = -1，实际摆放也是 x1 y1，两种算法同一个结果 */
    vbs: { both: '-1 -1 16 16' },
  },
];

for (const ic of ICONS) {
  const src = readFileSync(new URL('./' + ic.file + '.svg', import.meta.url), 'utf8');
  /* 只取 <g id="Union"> 那一段，并把写死的 #141414 / black 换成 currentColor —— 与入库口径一致 */
  const inner = src
    .replace(/[\s\S]*?<g id="Union">/, '<g id="Union">')
    .replace(/<\/svg>\s*$/, '')
    .replace(/fill="(#141414|black)"/g, 'fill="currentColor"');
  const canvas = coverage(readFileSync(new URL('./' + ic.canvas + '.png', import.meta.url)));
  const xforms = {
    none: '',
    mirrorX: `translate(${ic.w} 0) scale(-1 1)`,
    mirrorY: `translate(0 ${ic.h}) scale(1 -1)`,
    rot180: `translate(${ic.w} ${ic.h}) scale(-1 -1)`,
  };
  for (const [vbName, vb] of Object.entries(ic.vbs)) {
    const out = [];
    for (const [k, tf] of Object.entries(xforms)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="${vb}" fill="none" color="#141414">`
        + (tf ? `<g transform="${tf}">${inner}</g>` : inner) + '</svg>';
      const png = new Resvg(svg, {}).render().asPng();
      if (k === 'none') writeFileSync(new URL(`./${ic.key}_render_${vbName}.png`, import.meta.url), png);
      const r = coverage(png);
      let err = 0;
      for (let i = 0; i < r.length; i++) err += Math.abs(r[i] - canvas[i]);
      out.push(k + ' ' + (err / r.length).toFixed(4));
    }
    console.log(ic.zh.padEnd(5), ic.node.padEnd(12), (vbName + ' ' + vb).padEnd(30), out.join('  '));
  }
}
