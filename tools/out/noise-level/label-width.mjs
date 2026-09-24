/* 收紧「其他实时数据图标」表三个平台列的列宽前，先把这三列里真实的内容宽量出来：
   每列的下限 = max(徽标 / 图标底的宽, 最长一行文字的宽) + 左右内边距 12×2。
   文字宽按 12px 系统字体估：CJK 与全角标点按 12px，ASCII 按下面的字宽表
   （SF Pro / Helvetica 的 em 比例，12px 下取整到 0.1px）。
   ⚠️ 这是估算，不是浏览器实测 —— 所以最后取值会在估算值上再留余量。
   文字会折行（overflow-wrap: break-word），所以量的是「最长的不可断片段」：
   中文逐字可断，取单字 12px；英文按空格断，取最长单词。
   用法：cd tools/out/noise-level && node label-width.mjs */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');

/* 12px 下的字宽（px）。数字全部等宽 6.7；字母按 Helvetica 的 advance 比例折算。 */
const W = { digit: 6.7, space: 3.3, upper: 8.0, lower: 6.4, narrow: 3.6, punct: 3.6 };
const charW = (ch) => {
  if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(ch)) return 12;   // CJK 与全角
  if (/\d/.test(ch)) return W.digit;
  if (ch === ' ') return W.space;
  if (/[iljtfr.,:;'’|]/.test(ch)) return W.narrow;
  if (/[A-Z]/.test(ch)) return W.upper;
  if (/[a-z]/.test(ch)) return W.lower;
  return W.lower;
};
const textW = (s) => [...s].reduce((n, c) => n + charW(c), 0);
/* 最长的不可断片段：英文按空格切，中文逐字可断（所以中文片段折到 12px 也能排）。
   为了不把中文列压到逐字换行，这里对纯中文片段仍按整段算 —— 列宽要能放下一整行。 */
const longestChunk = (s) => Math.max(...s.split(/\s+/).map(textW), 0);

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const vc = new VirtualConsole();
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url: 'http://localhost/' });
const { document } = dom.window;

const COLS = [
  { name: 'IoT', sel: '.iot-mode', label: '.iot-mode__label', chip: 36, head: 'IoT' },
  { name: '云视界', sel: '.yun-mode', label: '.yun-mode__label', chip: 48, head: '云视界' },
  { name: 'LiveView', sel: '.overlay-mode', label: '.overlay-mode__label', chip: 48, head: 'LiveView' },
];
const PAD = 24;         // 单元格左右内边距 12×2（--cell-pad-x）
const HEAD_SCALE = 14 / 12 * 1.02;   // 表头是 14px/600，比 12px/400 宽一点

for (const col of COLS) {
  const cells = [...document.querySelectorAll('#tbodyLive ' + col.sel)];
  const labels = [...new Set(cells.map((el) => el.querySelector(col.label).textContent.trim()))];
  const ranked = labels.map((s) => ({ s, full: textW(s), chunk: longestChunk(s) }))
    .sort((a, b) => b.full - a.full);
  const headW = textW(col.head) * HEAD_SCALE;
  const need = Math.max(col.chip, ranked[0].chunk, headW) + PAD;
  console.log(`\n${col.name}  格数 ${cells.length} / 去重文案 ${labels.length}`);
  console.log(`  表头「${col.head}」约 ${headW.toFixed(0)}px`);
  console.log('  最长的 5 条文案（整段宽 / 最长不可断片段）');
  for (const r of ranked.slice(0, 5)) console.log(`    ${r.s.padEnd(14)} ${r.full.toFixed(0)} / ${r.chunk.toFixed(0)}`);
  console.log(`  列下限 = max(徽标 ${col.chip}, 最长片段 ${ranked[0].chunk.toFixed(0)}, 表头 ${headW.toFixed(0)}) + ${PAD} = ${need.toFixed(0)}px`);
}
dom.window.close();
process.exit(0);
