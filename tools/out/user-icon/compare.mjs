/* 访客（Penthouse Visitor Service）标准版换图前后的对照：
   库里 user（615:1737，单人）vs 原来用的 usergroup（615:1753，两人）。
   KFPS 徽标见 assets/kfps/visitor.png —— 画的是单人，所以 user 才对得上。
   上排 100px 放大，下排 16px 真实尺寸。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const pickStd = (key) => {
  const re = new RegExp(key + ": \\{ name: '[^']*', node: '[^']*', vb: '([^']*)', svg: '(.*?)' \\},");
  const m = html.match(re);
  if (!m) throw new Error('not found in STD_ICONS: ' + key);
  return { vb: m[1], inner: m[2] };
};

const userSvg = readFileSync(new URL('./user.svg', import.meta.url), 'utf8');
const items = [
  {
    n: 'user 615:1737（换成这个）',
    vb: '-2.25 -1.5497 16 16',
    inner: userSvg.replace(/[\s\S]*?(<path)/, '$1').replace(/<\/svg>\s*$/, '').replace(/fill="#141414"/g, 'fill="currentColor"'),
  },
  { n: 'usergroup 615:1753（原来）', ...pickStd('usergroup') },
];

const cell = (it, col, row, px) => {
  const x = 16 + col * 150;
  const y = 28 + row * 150;
  const pad = (130 - px) / 2;
  return `<g transform="translate(${x} ${y})">`
    + `<rect width="130" height="130" fill="#fff" stroke="#dfe1e8"/>`
    + `<svg x="${pad}" y="${pad}" width="${px}" height="${px}" viewBox="${it.vb}" fill="none" color="#141414">${it.inner}</svg>`
    + `</g>`
    + `<text x="${x}" y="${y - 6}" font-family="sans-serif" font-size="10" fill="#676a72">${it.n}</text>`;
};

let body = '';
items.forEach((it, i) => { body += cell(it, i, 0, 100); body += cell(it, i, 1, 16); });
const w = 16 + items.length * 150;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="330" viewBox="0 0 ${w} 330"><rect width="100%" height="100%" fill="#f5f7fa"/>${body}</svg>`;
writeFileSync(new URL('./compare.png', import.meta.url), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log('上排 100px 放大 / 下排 16px 真实尺寸');
