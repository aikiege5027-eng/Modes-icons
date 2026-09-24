/* setting-off / relevel / relevel-slow 新旧两版的对照图
   （上 120px 看构造、下两枚 20px 原寸看实际观感）。
   旧版是 TDesign 素材按 normalize-icon 流水线改造的单条 path；
   新版是设计在 IOT Delivery 直接画的 16 网格图。
   最后一格额外把**已经落库的 relevel** 拿来并排 —— relevel 与 relevel-slow 是相邻两行，
   新版两张的构图非常接近（同一组箭头 + 同一条中线，只差竖杆连续还是断开），
   必须当场确认 20px 下分得出来，不然就是换出了一对撞形。
   用法：cd tools/out/std-v2 && node compare.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const pick = (k) => JSON.parse(dom.window.eval(`JSON.stringify(STD_ICONS.${k})`));
const inline = (f) => readFileSync(new URL('./' + f, import.meta.url), 'utf8').trim();

/* ⚠️ 被换掉的旧版要写死在这里，不能 pick('relevel_slow')：新版已经落进 index.html，
   再从页面读就变成「新版对自己」，对照图会出现两格一模一样。
   下面这条是 TDesign align-bottom 走流水线改造的那一版（底线 + 一根长下箭头），
   配方归档在 tools/icons.config.mjs 的 TDESIGN_ARCHIVE。 */
const OLD_SLOW = {
  src: 'TDesign Icons 0.4.7 · align-bottom（已归档）',
  vb: '0 0 16 16',
  svg: '<path id="Union" d="M9 11L11.1 8.2L11.9 8.8L9.2 12.4C9.02587 12.6322 8.79913 12.7582 8.51976 12.778C8.24039 12.79787 7.9981 12.7052 7.79289 12.5L4.14645 8.85355L4.85355 8.14645L8 11.2929L8 1.5L9 1.5L9 11ZM14.5 15L1.5 15L1.5 14L14.5 14L14.5 15Z" fill="currentColor"/>',
};

const cells = [
  ['新版 relevel_slow', 'IOT Delivery 12007:216496', '0 0 16 16', inline('relevel_slow-inline.txt')],
  ['旧版 relevel_slow', OLD_SLOW.src, OLD_SLOW.vb, OLD_SLOW.svg],
];
/* 已落库的邻居，用来看会不会撞形 */
for (const k of ['relevel', 'setting_off']) {
  const e = pick(k);
  cells.push(['已落库 ' + k, e.src + (e.node ? ' ' + e.node : ''), e.vb, e.svg]);
}

const parts = [];
cells.forEach(([title, note, vb, body], i) => {
  const v = vb.split(' ').map(Number);
  const x = i * 210 + 40;
  const ink = body.replace(/currentColor/g, '#141414');
  parts.push(`<rect x="${x}" y="16" width="120" height="120" fill="#ffffff" stroke="#dfe1e8"/>`);
  parts.push(`<g transform="translate(${x} 16) scale(${120 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink}</g>`);
  /* 下面两枚是 20px 原寸（现在页面上的显示框就是 20px），右边那枚换次要文字色 */
  parts.push(`<g transform="translate(${x + 28} 146) scale(${20 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink}</g>`);
  parts.push(`<g transform="translate(${x + 64} 146) scale(${20 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink.replace(/#141414/g, '#676a72')}</g>`);
  parts.push(`<text x="${x + 60}" y="192" text-anchor="middle" font-size="12" fill="#141414">${title}</text>`);
  parts.push(`<text x="${x + 60}" y="208" text-anchor="middle" font-size="10" fill="#676a72">${note.replace(/&/g, '&amp;')}</text>`);
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cells.length * 210 + 80}" height="222" fill="none">`
  + '<rect width="100%" height="100%" fill="#ffffff"/>' + parts.join('') + '</svg>';
writeFileSync(new URL('./std-compare.png', import.meta.url),
  new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log('写出 std-compare.png（' + cells.length + ' 格）');
dom.window.close();
process.exit(0);
