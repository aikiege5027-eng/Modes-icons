/* 新旧两版 robot 的对照图（上 120px 看构造、下 20px 原寸看实际观感）。
   旧版是 TDesign 素材按 normalize-icon 流水线改造的单条 path；
   新版是设计在 IOT Delivery 直接画的 16 网格图（6 条 path，其中 1 条带 evenodd）。
   用法：cd tools/out/robot-v2 && node compare.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const old = JSON.parse(dom.window.eval('JSON.stringify(STD_ICONS.robot)'));
const neu = readFileSync(new URL('./robot-inline.txt', import.meta.url), 'utf8').trim();

const cells = [
  ['新版 Robot', 'IOT Delivery 12007:216383', '0 0 16 16', neu],
  ['旧版 robot', 'TDesign 改造（即将被替换）', old.vb, old.svg],
];
const parts = [];
cells.forEach(([title, note, vb, body], i) => {
  const v = vb.split(' ').map(Number);
  const x = i * 210 + 40;
  const ink = body.replace(/currentColor/g, '#141414');
  parts.push(`<rect x="${x}" y="16" width="120" height="120" fill="#ffffff" stroke="#dfe1e8"/>`);
  parts.push(`<g transform="translate(${x} 16) scale(${120 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink}</g>`);
  /* 下面两枚是 20px 原寸（现在页面上的显示框就是 20px） */
  parts.push(`<g transform="translate(${x + 28} 146) scale(${20 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink}</g>`);
  parts.push(`<g transform="translate(${x + 64} 146) scale(${20 / v[2]}) translate(${-v[0]} ${-v[1]})">${ink.replace(/#141414/g, '#676a72')}</g>`);
  parts.push(`<text x="${x + 60}" y="192" text-anchor="middle" font-size="12" fill="#141414">${title}</text>`);
  parts.push(`<text x="${x + 60}" y="208" text-anchor="middle" font-size="11" fill="#676a72">${note}</text>`);
});
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="460" height="222" fill="none">'
  + '<rect width="100%" height="100%" fill="#ffffff"/>' + parts.join('') + '</svg>';
writeFileSync(new URL('./robot-compare.png', import.meta.url),
  new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log('写出 robot-compare.png');
dom.window.close();
process.exit(0);
