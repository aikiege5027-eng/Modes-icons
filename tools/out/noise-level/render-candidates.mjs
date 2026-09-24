/* 把手绘候选渲成「96px 看构造 + 16px 看可辨识度」的对照条。
   16px 那一档才是验收标准 —— 这一列在页面上就是 16px。
   用法：cd tools/out/noise-level && node render-candidates.mjs handrail-a handrail-b handrail-c */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');

const names = process.argv.slice(2);
const CELL = 150;
const parts = [];
names.forEach((n, i) => {
  const src = readFileSync(new URL('../' + n + '.svg', import.meta.url), 'utf8');
  const d = (src.match(/\bd="([^"]*)"/) || [])[1];
  const x = i * CELL;
  parts.push(`<g transform="translate(${x + 15} 20) scale(6)"><path d="${d}" fill="#141414"/></g>`);
  /* 16px 原寸放三份：白底、浅底、以及放大 4 倍的「像素观感」（nearest 放大看不了，
     这里就并排放原寸，肉眼近看即可） */
  parts.push(`<g transform="translate(${x + 30} 128)"><path d="${d}" fill="#141414"/></g>`);
  parts.push(`<g transform="translate(${x + 60} 128)"><path d="${d}" fill="#676a72"/></g>`);
  parts.push(`<text x="${x + CELL / 2}" y="170" text-anchor="middle" font-size="13" fill="#141414">${n}</text>`);
  parts.push(`<text x="${x + CELL / 2}" y="186" text-anchor="middle" font-size="11" fill="#676a72">上 96px · 下 16px 原寸</text>`);
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL * names.length}" height="200" fill="none">`
  + `<rect width="100%" height="100%" fill="#fff"/>${parts.join('')}</svg>`;
writeFileSync(new URL('./handrail-candidates.png', import.meta.url), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
/* 再出一张纯 16px 放大版（图像层面放大 8 倍，看像素落位） */
const zoom = names.map((n, i) => {
  const src = readFileSync(new URL('../' + n + '.svg', import.meta.url), 'utf8');
  const d = (src.match(/\bd="([^"]*)"/) || [])[1];
  return `<g transform="translate(${i * 140} 0)"><path d="${d}" fill="#141414"/></g>`;
}).join('');
const zsvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${140 * names.length}" height="16" viewBox="0 0 ${140 * names.length} 16" fill="none"><rect width="100%" height="100%" fill="#fff"/>${zoom}</svg>`;
const png = new Resvg(zsvg, { fitTo: { mode: 'zoom', value: 8 } }).render().asPng();
writeFileSync(new URL('./handrail-candidates-16px.png', import.meta.url), png);
console.log('handrail-candidates.png / handrail-candidates-16px.png');
