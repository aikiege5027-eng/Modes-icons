/* 临时：核对 IOT Delivery 新画的「齿轮箱振动」16 网格版
   1) 与 IoT 卡片里在用的 20 网格版比构造
   2) 与库里同表在用的 elevator-door / vibration-Horizonta 比线宽与视觉重量
   3) 16px 真实尺寸下的样子 */
import { readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const pick = (re) => {
  const m = html.match(re);
  if (!m) throw new Error('not found: ' + re);
  return m[1];
};
const iot20 = pick(/gearbox: \{ name: '齿轮箱振动', svg: '(.*?)' \},/);
const vibH = pick(/vibrationHorizonta: \{ name: 'vibration-Horizonta', node: '13145:33', vb: '[^']*', svg: '(.*?)' \},/);

const newSvgFile = readFileSync(new URL('./gearbox-vibration.svg', import.meta.url), 'utf8');
const newInner = newSvgFile.replace(/[\s\S]*?<g id="Union">/, '<g id="Union">').replace(/<\/svg>\s*$/, '')
  .replace(/fill="#141414"/g, 'fill="currentColor"');

const items = [
  { name: 'new 16格 (IOT Delivery 10595:72358)', vb: '-0.44917 -2 16 16', inner: newInner },
  { name: 'IoT 卡片在用 20格 (10602:48773)', vb: '0 0 20 20', inner: iot20 },
  { name: '库 vibration-Horizonta', vb: '-3.000065 -2.74315 16 16', inner: vibH },
];

const rows = [100, 16].map((px, ri) => items.map((it, i) => {
  const x = 20 + i * 180;
  const y = 20 + ri * 140;
  const pad = (120 - px) / 2;
  return `<g transform="translate(${x} ${y})">`
    + `<rect width="120" height="120" fill="#fff" stroke="#dfe1e8"/>`
    + `<svg x="${pad}" y="${pad}" width="${px}" height="${px}" viewBox="${it.vb}" fill="none" color="#141414">${it.inner}</svg>`
    + `</g>`;
}).join('')).join('');

const labels = items.map((it, i) => `<text x="${20 + i * 180}" y="14" font-family="sans-serif" font-size="10" fill="#676a72">${i}</text>`).join('');
const w = 20 + items.length * 180;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="300" viewBox="0 0 ${w} 300"><rect width="100%" height="100%" fill="#f5f7fa"/>${labels}${rows}</svg>`;
writeFileSync(new URL('./compare.png', import.meta.url), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log(items.map((it, i) => i + ' = ' + it.name).join('\n'));
console.log('上排 100px 放大，下排 16px 真实尺寸');
