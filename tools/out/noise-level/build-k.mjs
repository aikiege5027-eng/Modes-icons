/* 候选 K：不新画手，直接改造库内 click ——
   去掉那 5 圈「光圈」subpath（点击的语义就在那几道弧上），只留手的轮廓，
   再在原来光圈的位置补一条通宽横线当扶手带。
   这是用户给的方向里最保守的一版：手还是库里那只（16px 下本来就认得出），
   只换掉语义不对的那部分。
   ⚠️ 不走 normalize-icon 流水线：那条流水线是「中心线 → 1px 描边」，
   而这里要保留 click 现成的轮廓（含内孔，靠 nonzero 绕向），
   过一遍 union 会把内孔填掉。所以这里只做 subpath 级的字符串手术。
   用法：cd tools/out/noise-level && node build-k.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const click = JSON.parse(dom.window.eval('JSON.stringify(LIVE_STD_ICONS.click)'));
const d = (click.svg.match(/\bd="([^"]*)"/) || [])[1];
/* 按 M 切 subpath，并量各自的包围盒，好认出哪几个是光圈 */
const subs = d.split(/(?=M)/).filter(Boolean);
const bbox = (sd) => {
  const nums = sd.match(/-?\d*\.?\d+/g).map(Number);
  const xs = []; const ys = [];
  for (let i = 0; i < nums.length; i += 2) { xs.push(nums[i]); ys.push(nums[i + 1]); }
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};
subs.forEach((s, i) => {
  const b = bbox(s);
  console.log(`subpath ${i}  ${b.w.toFixed(2)}×${b.h.toFixed(2)}  ${s.slice(0, 40)}…`);
});
/* 手 = subpath 2（内孔）+ 3（外轮廓）；0 / 1 / 4 / 5 / 6 是五道光圈。
   ⚠️ 别拿「面积最大」去自动挑：H / V 这种简写指令的坐标不是成对的 xy，
   按对切会把 2 / 3 的包围盒算成 NaN，自动挑就挑错了（第一版就踩了这个）。
   这五条光圈的身份是按起点与形状认的，并且下面渲图核对过：
     0  M4.5 2  …  正上方那道（4.5×5 其实是 H/V 混排算错的数，实际是一道短竖）
     1  M8.91422 2.35355 …  右上斜的一道
     4  M0.5 4.5 …  左边一道横线
     5  M7.5 4.5 …  右边一道横线
     6  M1.5 1.29289 …  左上斜的一道 */
const keep = [2, 3];
const hand = keep.map((i) => subs[i]).join('');
/* 扶手带：一条通宽的 1px 横线，**下沿贴住指尖**。
   click 的画框是 vb '-2.8456 -1 16 16'，所以通宽要按这个画框算（左右各留 0.5）。
   y 取 2.5~3.5：click 外轮廓的最高点（指尖）正好在 y3.5，所以带的下沿与指尖相接 ——
   比对过四种落位（tools/out/noise-level/handrail-k-variants.png）：
     y0.5 通宽   带贴画框顶边，离指尖 3px，读起来像一条上边框，不像手搭在带上
     y1.5 通宽   留 1px 缝，像「即将触到」
     y2.5 通宽   与指尖相接 ← 选这个，语义是「手搭在扶手带上」
     y2.5 收窄   带只有 12 单位宽，像一小段，不像一条贯通的带 */
const x0 = -2.8456 + 0.5; const x1 = -2.8456 + 16 - 0.5;
const bar = `M${x0.toFixed(4)} 2.5H${x1.toFixed(4)}V3.5H${x0.toFixed(4)}Z`;
const out = hand + bar;
writeFileSync(new URL('./handrail-k.path', import.meta.url), out + '\n');
const svg = (px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${click.vb}" fill="none"><path d="${out}" fill="#141414"/></svg>`;
writeFileSync(new URL('./handrail-k96.png', import.meta.url), new Resvg(svg(96), {}).render().asPng());
writeFileSync(new URL('./handrail-k16.png', import.meta.url), new Resvg(svg(16), {}).render().asPng());
console.log('写出 handrail-k.path / handrail-k96.png / handrail-k16.png');
dom.window.close();
process.exit(0);
