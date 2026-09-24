/* 「同样是 20px 显示框，各图标实际占多大」的对照图。
   每格画一个 20px 的显示框（灰边）+ 图标按自己的 viewBox 铺满这个框，整体放大 6 倍看。
   标注的「单位」是墨迹长边在 16 单位画框里的实测值（PathKit 求包围盒，不是写死的）——
   放大显示框不会改变这个比例，图标之间的大小差异全来自这个数。
   用法：cd tools/out/noise-level && node fill-compare.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');
const init = require('pathkit-wasm/bin/pathkit.js');
const PathKit = await init({ wasmBinary: readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm')) });

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const g = (k) => JSON.parse(dom.window.eval('JSON.stringify(LIVE_STD_ICONS.' + k + ')'));

const items = [
  ['handrailLeft', '左扶手带温度'],
  ['handrailRight', '右扶手带温度'],
  ['levelSensing', '平层感应'],
  ['gearboxVibration', '齿轮箱振动'],
  ['layers', 'layers（库内）'],
];
const Z = 6; const BOX = 20; const CELL = 150;
const parts = [];
items.forEach(([k, zh], i) => {
  const icon = g(k);
  const vb = icon.vb.split(' ').map(Number);
  /* 墨迹长边：把 svg 片段里所有 d 拼起来求包围盒。带 <g transform> 的那条（左扶手）
     转换只是镜像，不改尺寸，所以不用管。 */
  const ds = [...icon.svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  const p = PathKit.FromSVGString(ds.join(' '));
  const b = p.getBounds();
  p.delete();
  const units = Math.max(b.fRight - b.fLeft, b.fBottom - b.fTop);
  const px = units / vb[2] * BOX;
  const x = i * CELL + 30;
  parts.push(`<rect x="${x}" y="20" width="${BOX * Z}" height="${BOX * Z}" fill="#ffffff" stroke="#dfe1e8"/>`);
  parts.push(`<g transform="translate(${x} 20) scale(${BOX * Z / vb[2]}) translate(${-vb[0]} ${-vb[1]})">`
    + icon.svg.replace(/currentColor/g, '#141414') + '</g>');
  parts.push(`<text x="${x + BOX * Z / 2}" y="162" text-anchor="middle" font-size="12" fill="#141414">${zh}</text>`);
  parts.push(`<text x="${x + BOX * Z / 2}" y="178" text-anchor="middle" font-size="11" fill="#676a72">`
    + `${units.toFixed(1)} 单位 → ${px.toFixed(1)}px</text>`);
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL * items.length + 30}" height="195" fill="none">`
  + `<rect width="100%" height="100%" fill="#ffffff"/>${parts.join('')}</svg>`;
writeFileSync(new URL('./handrail-fill-compare.png', import.meta.url),
  new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
console.log('写出 handrail-fill-compare.png（灰框 = 20px 显示框，放大 6 倍；单位数为实测）');
dom.window.close();
process.exit(0);
