/* 把「左 / 右扶手带温度」这一组在三个平台上的图，加上库里的 click，一起渲成一张对照图，
   用来判断标准版该怎么定（语义 vs 线性风格）。
   取图方式：在 jsdom 里把 index.html 跑起来，再用 window.eval 读那几个图标常量 ——
   它们是脚本顶层的 const，不挂在 window 上，但 eval 在全局作用域里能取到。
   渲染：resvg，每张 96px，画框按各自的 viewBox（20 / 24 / 16 三种网格混在一起，
   所以这张图比的是**构造与风格**，不是尺寸。
   用法：cd tools/out/noise-level && node handrail-sheet.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');
const { Resvg } = require('@resvg/resvg-js');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), url: 'http://localhost/' });
const ev = (expr) => dom.window.eval(expr);

const ITEMS = [
  { file: 'yun-click', title: '云视界 右扶手（click，24 网格）', vb: '0 0 24 24', svg: ev('LIVE_ICONS.click.svg') },
  { file: 'yun-click-mirror', title: '云视界 左扶手（同一张 click 水平镜像）', vb: '0 0 24 24', tf: 'scaleX(-1)', svg: ev('LIVE_ICONS.click.svg') },
  { file: 'iot-left', title: 'IoT 左扶手带温度（20 网格，独立画的）', vb: '0 0 20 20', svg: ev('IOT_LIVE_ICONS.handrailLeft.svg') },
  { file: 'iot-right', title: 'IoT 右扶手带温度（20 网格，与 click 逐字节等价）', vb: '0 0 20 20', svg: ev('IOT_LIVE_ICONS.handrailRight.svg') },
  { file: 'lv-handrail', title: 'LiveView handrail（20 网格，实底）', vb: '0 0 20 20', svg: ev('LIVEVIEW_LIVE_ICONS.handrail.svg') },
  { file: 'lib-click', title: '库内 click 16 网格（标准版现在用的）', vb: ev('JSON.stringify(LIVE_STD_ICONS.click.vb)').replace(/"/g, ''), svg: ev('LIVE_STD_ICONS.click.svg') },
];

for (const it of ITEMS) {
  const inner = it.tf
    ? `<g transform="translate(24 0) scale(-1 1)">${it.svg}</g>`
    : it.svg;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${it.vb}" fill="none" color="#141414">`
    + inner.replace(/currentColor/g, '#141414') + '</svg>';
  writeFileSync(new URL('./handrail-' + it.file + '.png', import.meta.url), new Resvg(svg, {}).render().asPng());
  console.log(it.file.padEnd(18) + ' ' + it.title);
}

/* 再拼一张横排对照图（带文字标签），方便一眼比风格。
   每格 120×150：上面 96px 的图，下面两行说明。文字靠 resvg 的系统字体渲染。 */
{
  const CELL = 150; const IMG = 96; const H = 190;
  const order = ['yun-click', 'yun-click-mirror', 'iot-left', 'lv-handrail', 'lib-click'];
  const caption = {
    'yun-click': ['云视界 右扶手', 'click · 24 网格'],
    'yun-click-mirror': ['云视界 左扶手', '同一张 click 镜像'],
    'iot-left': ['IoT 左扶手带温度', '另画的镜像版 · 20'],
    'lv-handrail': ['LiveView handrail', '实底 · 20 网格'],
    'lib-click': ['库内 click', '16 网格 · 标准版在用'],
  };
  const parts = order.map((key, i) => {
    const it = ITEMS.find((x) => x.file === key);
    const x = i * CELL;
    const inner = it.tf ? `<g transform="translate(24 0) scale(-1 1)">${it.svg}</g>` : it.svg;
    const scale = IMG / Number(it.vb.split(' ')[2]);
    const vbx = Number(it.vb.split(' ')[0]); const vby = Number(it.vb.split(' ')[1]);
    return `<g transform="translate(${x + (CELL - IMG) / 2} 24)">`
      + `<g transform="scale(${scale}) translate(${-vbx} ${-vby})">`
      + inner.replace(/currentColor/g, '#141414')
      + '</g></g>'
      + `<text x="${x + CELL / 2}" y="${24 + IMG + 28}" text-anchor="middle" font-size="13" fill="#141414">${caption[key][0]}</text>`
      + `<text x="${x + CELL / 2}" y="${24 + IMG + 46}" text-anchor="middle" font-size="12" fill="#676a72">${caption[key][1]}</text>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL * order.length}" height="${H}" fill="none">`
    + `<rect width="100%" height="100%" fill="#ffffff"/>${parts}</svg>`;
  writeFileSync(new URL('./handrail-compare.png', import.meta.url), new Resvg(svg, { font: { loadSystemFonts: true } }).render().asPng());
  console.log('\n对照图 handrail-compare.png');
}

dom.window.close();
process.exit(0);
