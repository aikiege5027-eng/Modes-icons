/* 轿门振动三张：IOT Delivery 新画的 16 网格版 vs IoT 卡片在用的 20 网格版
   vs 原来落在标准版里的库图标。上排 100px 放大，下排 16px 真实尺寸。 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../package.json', import.meta.url));
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const pick = (re) => {
  const m = html.match(re);
  if (!m) throw new Error('not found: ' + re);
  return m[1];
};

const local = (f, vb) => {
  const s = readFileSync(new URL(f, import.meta.url), 'utf8');
  return {
    vb,
    inner: s.replace(/[\s\S]*?<g id="Union">/, '<g id="Union">').replace(/<\/svg>\s*$/, '')
      .replace(/fill="black"/g, 'fill="currentColor"'),
  };
};

const items = [
  { n: '新 横向 8457:23064', ...local('./lateral.svg', '-1 -3 16 16') },
  { n: '新 纵向 8457:23065', ...local('./longitudinal.svg', '-1 -3 16 16') },
  { n: '新 垂直 8457:23066', ...local('./vertical.svg', '-2 -1 16 16') },
  { n: 'IoT 横向 8460:8473', vb: '0 0 20 20', inner: pick(/vibrationLateral: \{ name: '[^']*', svg: '(.*?)' \},/) },
  { n: 'IoT 纵向 8460:8474', vb: '0 0 20 20', inner: pick(/vibrationLongitudinal: \{ name: '[^']*', svg: '(.*?)' \},/) },
  { n: 'IoT 垂直 8460:8475', vb: '0 0 20 20', inner: pick(/vibrationVertical: \{ name: '垂直振动', svg: '(.*?)' \},/) },
  { n: '库 vibration-Horizonta', vb: '-3.000065 -2.74315 16 16', inner: pick(/vibrationHorizonta: \{ name: 'vibration-Horizonta', node: '13145:33', vb: '[^']*', svg: '(.*?)' \},/) },
  { n: '库 vibration-vertical', vb: '-2.74315 -3.000055 16 16', inner: pick(/vibrationVertical: \{ name: 'vibration-vertical', node: '13145:34', vb: '[^']*', svg: '(.*?)' \},/) },
];

const COL = 3;
const CELL = 150;
const cell = (it, col, row, px) => {
  const x = 16 + col * CELL;
  const y = 28 + row * (CELL + 20);
  const pad = (130 - px) / 2;
  return `<g transform="translate(${x} ${y})">`
    + `<rect width="130" height="130" fill="#fff" stroke="#dfe1e8"/>`
    + `<svg x="${pad}" y="${pad}" width="${px}" height="${px}" viewBox="${it.vb}" fill="none" color="#141414">${it.inner}</svg>`
    + `</g>`
    + `<text x="${x}" y="${y - 6}" font-family="sans-serif" font-size="10" fill="#676a72">${it.n}</text>`;
};

let body = '';
items.forEach((it, i) => {
  const band = Math.floor(i / COL);
  body += cell(it, i % COL, band * 2, 100);
  body += cell(it, i % COL, band * 2 + 1, 16);
});

const bands = Math.ceil(items.length / COL);
const w = 16 + COL * CELL;
const h = 28 + bands * 2 * (CELL + 20);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f5f7fa"/>${body}</svg>`;
writeFileSync(new URL('./compare.png', import.meta.url), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log('每组两行：上 100px 放大 / 下 16px 真实尺寸');
