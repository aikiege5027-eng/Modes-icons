/* ============================================================
   把本次新增的 16 个标准版图标排成一张对照图，用于目视复核。
   直接读 index.html 里的 STD_ICONS，用页面上真实的 viewBox 渲染 ——
   不重新算一遍，避免「脚本里是对的、页面上是另一回事」。
   上排 16px 原尺寸（实际使用尺寸），下排 8 倍放大看圆角与线宽。
   用法：cd tools && node contact-sheet.mjs  →  tools/out/contact-sheet.png
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const STD_ICONS = {');
const end = html.indexOf('\n};', start);
const STD_ICONS = new Function(`return ${html.slice(start + 'const STD_ICONS = '.length, end + 2)}`)();

const GROUPS = [
  /* 这一批跟着选型改过几次名，STD_ICONS 里的 key 一变这里就要跟上，
     否则下面那句 throw 会直接把脚本打断：
       停止运行    elevator_door_closed → stop
       OSS Pending clock → minus_circle_filled → minus_circle_oss（与 minus_circle 同字形）
       启动模式    stop_play → play_2 → play_1
       故障状态    close_circle → warning_triangle（并入 ETSL / NTS 那条，已不属本批新增）
       构建模式    construction_mode（IOT Delivery 的安全帽）→ toolbox（库内），
                   所以 toolbox 也排进这一组一起看
       电机调谐    drive → current（drive 的字形是方向盘，读不出电机；腾给司机模式）
       FRE        backtop_m → home → open_the_door（backtop-M 是「回到顶部」、方向与回大堂
                  相反；home 取目的地；现在按要求取末态「到达后开门待命」）
       优先高/低区 arrow_up / arrow_down → zone_high / zone_low（箭头像运行方向，
                  库里补不了，已新画；见第三组）
       保持开门    elevator_door_opening → elevator_door_open（与 FRE 成对改，
                  两行一个按钮符号一个门扇，才不撞形）*/
  ['库内引用（Design Token China）', ['open_the_door', 'pin', 'stop',
    'current', 'play_1', 'forbid', 'minus_circle_oss', 'toolbox']],
  /* ⚠️ robot / setting_off / relevel / relevel_slow 都已不在这一组：它们换成了设计在
     IOT Delivery 画的版本（12007:216383 / 216438 / 216476 / 216496），
     不再是 TDesign 素材改造件。它们现在与 auto_circle 同类（设计画的、未入库），
     这张联络表只收「需要目视复核改造 / 新画结果」的那几个，所以不另立一组。
     relevel_slow 与 relevel 撞形那件事不靠这张表看 —— 两张并排放大在
     tools/out/std-v2/std-compare.png，量化口径在 tools/out/std-v2/pair-check.mjs。 */
  /* 吊坠（pendant）已换成库内 user-maintenance（615:1751），不再是改造件，从这一组移出 */
  ['外部引用（TDesign Icons 改造 · 未过评审）', ['shaft_learning']],
  /* 第三组：本项目新画。走同一条 normalize-icon 流水线，所以和上面一组一样
     需要目视复核 —— 尤其这一对要看「上半 / 下半填实」在 16px 下分不分得出来。 */
  ['本项目新画（未入库 · 未过评审）', ['zone_high', 'zone_low']],
];

const ZOOM = 8;
const COL = 130;          // 每列宽
const PAD = 24;
const ROW_H = 16 * ZOOM + 74;

let maxCols = Math.max(...GROUPS.map(([, keys]) => keys.length));
const W = PAD * 2 + maxCols * COL;
/* 每组的实际占高 = 34（组标题）+ ROW_H（两排图标 + 名称）+ 40（组间距）。
   ⚠️ 原来漏算了组标题那 34px，两组时只是底部略紧，加到三组后最后一组被裁掉。 */
const H = PAD * 2 + GROUPS.length * (34 + ROW_H + 40);

let body = `<rect width="${W}" height="${H}" fill="#ffffff"/>`;
let y = PAD;

for (const [title, keys] of GROUPS) {
  body += `<text x="${PAD}" y="${y + 14}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"`
    + ` font-size="14" font-weight="600" fill="#141414">${title}</text>`;
  y += 34;

  keys.forEach((key, i) => {
    const icon = STD_ICONS[key];
    if (!icon) throw new Error(`STD_ICONS 里没有 ${key}`);
    const x = PAD + i * COL;

    // 原尺寸 16px，配一个浅色底衬出画框
    body += `<rect x="${x}" y="${y}" width="16" height="16" fill="#f5f7fa"/>`
      + `<svg x="${x}" y="${y}" width="16" height="16" viewBox="${icon.vb}">${icon.svg.replace(/currentColor/g, '#141414')}</svg>`;

    // 放大版
    const zy = y + 26;
    body += `<rect x="${x}" y="${zy}" width="${16 * ZOOM}" height="${16 * ZOOM}" fill="#f5f7fa"/>`
      + `<svg x="${x}" y="${zy}" width="${16 * ZOOM}" height="${16 * ZOOM}" viewBox="${icon.vb}">${icon.svg.replace(/currentColor/g, '#141414')}</svg>`;

    body += `<text x="${x}" y="${zy + 16 * ZOOM + 18}" font-family="-apple-system, BlinkMacSystemFont, sans-serif"`
      + ` font-size="12" fill="#676a72">${icon.name}</text>`;
  });

  y += ROW_H + 40;
}

mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
writeFileSync(new URL('./out/contact-sheet.png', import.meta.url), new Resvg(svg).render().asPng());
console.log(`已生成 tools/out/contact-sheet.png（${W}\u00d7${H}）`);
