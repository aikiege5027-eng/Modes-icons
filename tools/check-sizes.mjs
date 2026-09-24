/* ============================================================
   标准版图标的视觉尺寸一致性检查（一次性）
   index.html 里有一条注释说「节点级导出那几个在格子里明显小一圈」。
   新加的 6 个外部引用也用 0 0 16 16 画框，所以要确认它们落在哪一档，
   别让补齐的图标一眼看着比邻居小。

   算法：从 index.html 里抠出 STD_ICONS，用 PathKit 求每条 path 的真实包围盒，
   换算成「在 16px 显示框里渲染出来的长边像素」= 长边单位 / viewBox 宽 × 16。
   用法：cd tools && node check-sizes.mjs
   ============================================================ */

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const init = require('pathkit-wasm/bin/pathkit.js');
const PathKit = await init({ wasmBinary: readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm')) });

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// 抠出 STD_ICONS 的字面量并求值（文件里它是纯数据，没有外部引用）
const start = html.indexOf('const STD_ICONS = {');
const end = html.indexOf('\n};', start);
const literal = html.slice(start + 'const STD_ICONS = '.length, end + 2);
const STD_ICONS = new Function(`return ${literal}`)();

/* .lift-icon 的显示框边长。⚠️ 从 CSS 读，不写死 —— 这个值改过一次（16 → 20，
   按要求放大看效果），写死的话这里会按旧值换算出一套对不上的「渲染长边」。
   CSS 里写的是 var(--comp-size-xxs) 这类变量，所以要先取变量名再查它的值。 */
const cellVar = (html.match(/\.lift-icon \{[^}]*width:\s*var\((--[\w-]+)\)/) || [])[1];
const CELL = Number((html.match(new RegExp(cellVar + ':\\s*(\\d+)px')) || [])[1]);
if (!CELL) throw new Error('读不到 .lift-icon 的显示框边长（' + cellVar + '）');

const rows = [];
for (const [key, icon] of Object.entries(STD_ICONS)) {
  // 把 svg 片段里所有 path 的 d 合起来求总包围盒
  const ds = [...icon.svg.matchAll(/\bd="([^"]+)"/g)].map((m) => m[1]);
  const p = PathKit.FromSVGString(ds.join(' '));
  const b = p.getBounds();
  p.delete();

  const vbW = Number(icon.vb.trim().split(/\s+/)[2]);
  const long = Math.max(b.fRight - b.fLeft, b.fBottom - b.fTop);
  rows.push({
    key,
    name: icon.name,
    /* 来源分档看 src：没有 src 就是 Design Token 库内引用。
       三类非库内：TDesign 素材改造、IOT Delivery 引用、本项目新画。
       别再写成「不是 TDesign 就是 IOT」—— 新画那批会被归错档。 */
    origin: !icon.src ? '库内'
      : icon.src.startsWith('TDesign') ? 'TDesign'
        : /新画/.test(icon.src) ? '新画'
          : 'IOT',
    px: (long / vbW) * CELL,
  });
}

rows.sort((a, b) => a.px - b.px);

const stat = (list) => {
  const v = list.map((r) => r.px);
  return v.length
    ? `n=${String(v.length).padStart(2)}  min ${Math.min(...v).toFixed(1)}  中位 ${v[Math.floor(v.length / 2)].toFixed(1)}  max ${Math.max(...v).toFixed(1)}`
    : 'n=0';
};

console.log('渲染长边（' + CELL + 'px 显示框内，单位 px）');
console.log('  全部        ', stat(rows));
console.log('  库内引用    ', stat(rows.filter((r) => r.origin === '库内')));
console.log('  IOT Delivery', stat(rows.filter((r) => r.origin === 'IOT')));
console.log('  TDesign 改造', stat(rows.filter((r) => r.origin === 'TDesign')));
console.log('  本项目新画  ', stat(rows.filter((r) => r.origin === '新画')));

console.log('\n最小的 8 个');
for (const r of rows.slice(0, 8)) console.log(`  ${r.px.toFixed(1).padStart(5)}  ${r.origin.padEnd(12)} ${r.name}`);
console.log('\n最大的 8 个');
for (const r of rows.slice(-8)) console.log(`  ${r.px.toFixed(1).padStart(5)}  ${r.origin.padEnd(12)} ${r.name}`);

/* 明显偏小的要单独点出来 —— 一列图标里有一个特别小会很显眼。
   8px 这条线是按实测定的：库里那批集中在 9~15.4px，低于 8 的只可能是
   本身就极小的字形（例如 stop 只占 4×6 单位）。
   这里只报告不失败：小不等于错，是库里的原始比例，换不换由设计定。

   ⚠️ 这里原来写死了一份「本次新增的 16 个」名单，结果换图标后名单里的 key
   不存在了，rows.find() 返回 undefined，脚本直接崩。选型一直在调整，
   所以改成从实测数据里筛，不再维护名单。 */
/* ⚠️ 8px 这条线是按「16px 显示框」实测定的，显示框放大后要跟着按比例放 ——
   否则框换成 20px、所有图标等比涨了 1.25 倍，这条线还停在 8 就永远筛不出东西来。 */
const TINY = 8 * (CELL / 16);
const tiny = rows.filter((r) => r.px < TINY);
console.log(`\n渲染长边小于 ${TINY}px 的（${tiny.length} 个）`);
if (tiny.length === 0) console.log('  无');
for (const r of tiny) {
  console.log(`  ${r.px.toFixed(1).padStart(5)}  ${r.origin.padEnd(12)} ${r.name}`
    + '   ← 比同列邻居明显小，确认是否可接受');
}

/* ============================================================
   模式表的列宽自洽性
   --modes-table-w 是表格的 min-width，必须等于「定宽列之和 + 8 个平台列 ×136」。
   加列或改列宽时很容易只改一处，导致窗口收窄时平台列被摊走宽度。
   ============================================================ */

const PLATFORM_COLS = 8;
/* 平台列不在 CSS 里设宽度（table-layout: fixed 平分剩余空间），所以只能写在这里。
   改过两轮：
     136 → 128  单元格左右内边距 16px → 12px，每列减 8px（见 index.html 的 --cell-pad-x）
     128 → 122  加下载列（96px）之后要把宽度匀出来。下限是最长表头 MyDeviceView
                实测 94px + 12px×2 内边距 = 118，留 4px 余量。 */
const PLATFORM_W = 122;

const declared = Number((html.match(/--modes-table-w:\s*(\d+)px/) || [])[1]);

/* 从 CSS 里读定宽列，顺序无关，只求和。col-platform 不在其中（它不设宽度，
   由 table-layout: fixed 平分剩余空间）。
   ⚠️ col-download 有两条规则：`.col-download { width: 128px }` 是「梯型 / 功能图标」
   那张表用的，模式图标表由 96px 那条覆盖。这里要取后者 ——
   按前者算会把总宽算多 32px，校验会误报。
   那条 96px 的规则是选择器组（模式图标表与其他实时数据表同一套 14 列结构，共用它），
   所以不能死板地匹配「#panel-modes .col-download 紧跟 {」，要允许选择器组里还有别的项。 */
/* ⚠️ 正则必须锚在行首（m 标志 + ^）：col-mode-en 除了通用那条，还有一条
   `#panel-live .col-mode-en { width: 160px }`（其他实时数据表的「实时数据细分」列）。
   不锚行首的话 `\.col-mode-en` 会先命中那条带前缀的规则，模式表的总宽就算错了。 */
const widthOf = (cls) => {
  const m = html.match(new RegExp(`^\\.${cls}\\s*\\{[^}]*width:\\s*(\\d+)px`, 'm'));
  return m ? Number(m[1]) : NaN;
};
const fixedCols = ['col-pri', 'col-type', 'col-mode-zh', 'col-mode-en', 'col-note'];
const widths = fixedCols.map((cls) => ({ cls, px: widthOf(cls) }));
const dlM = html.match(/[^{}]*#panel-modes \.col-download[^{}]*\{[^}]*width:\s*(\d+)px/);
widths.push({ cls: 'col-download', px: dlM ? Number(dlM[1]) : NaN });

const sum = widths.reduce((s, w) => s + w.px, 0);
const expected = sum + PLATFORM_COLS * PLATFORM_W;

console.log('\n模式表列宽');
for (const w of widths) console.log(`  ${w.cls.padEnd(14)} ${String(w.px).padStart(4)}px`);
console.log(`  ${'定宽列合计'.padEnd(12)} ${String(sum).padStart(4)}px`);
console.log(`  平台列 ${PLATFORM_COLS} × ${PLATFORM_W}px = ${PLATFORM_COLS * PLATFORM_W}px`);
console.log(`  --modes-table-w  声明 ${declared}px / 应为 ${expected}px`);

// colgroup 里的 col 数量也要对上：定宽列 + span=8 的平台列
const colgroup = html.slice(html.indexOf('<colgroup>'), html.indexOf('</colgroup>'));
const colCount = [...colgroup.matchAll(/<col\b[^>]*>/g)]
  .reduce((n, m) => n + Number((m[0].match(/span="(\d+)"/) || [, 1])[1]), 0);
/* 定宽列现在是 6 个（多了 col-download），widths.length 就是它 —— 不要再用
   fixedCols.length，那个数组里没有 col-download（它的宽度是从另一条规则读的）。 */
const fixedColCount = widths.length;
console.log(`  colgroup 覆盖列数 ${colCount}（应为 ${fixedColCount + PLATFORM_COLS}）`);

const problems = [];
if (widths.some((w) => Number.isNaN(w.px))) {
  problems.push(`CSS 里找不到列宽：${widths.filter((w) => Number.isNaN(w.px)).map((w) => w.cls).join(', ')}`);
}
if (declared !== expected) {
  problems.push(`--modes-table-w 应为 ${expected}px，实际 ${declared}px —— 加列或改列宽后忘了同步`);
}
if (colCount !== fixedColCount + PLATFORM_COLS) {
  problems.push(`colgroup 覆盖 ${colCount} 列，应为 ${fixedColCount + PLATFORM_COLS} 列`);
}

/* ============================================================
   「其他实时数据图标」表的列宽自洽性
   9 列：梯型 + 实时数据名称 + 实时数据细分 + 3 个平台 + 标准版×2 + 下载。
   平台列只剩 IoT / 云视界 / LiveView —— 比模式表少了 Priority、AMC（参考）、
   KFPS、MyDeviceView、大屏 五列（前两个是 AMC 文档的概念，后三个还没拿到设计稿）。
   ⚠️ 也**没有注释列**：那一列是模式图标表的本地草稿功能，这张表里一直是空的，
   已整列删掉（理由与补回来的做法见 index.html 里 #panel-live 的 colgroup 注释）。
   所以 liveWidths 里不要再放 col-note —— 放了的话期望总宽会多 52px，校验会误报。
   ⚠️ 标准版**不在**平台列里算，而且它是**两列**：这张表有两行（轿门传感器振动
   横向 / 垂直）各有两个并存的候选，拆成左右两个单元格（其余行是一个 colspan="2"
   的格子横跨两列）。两列**等分**，各 136px —— 下限由「右格要装下 vibration-Horizonta」
   和「Chrome 会把跨列格子 min-content 的缺口压到最后一个被跨的列上」一起定，
   算法与实测见 CSS 里 #panel-live .col-std / .col-std-alt。
   模式表的标准版永远只有一个图标，仍在平台列里。
   名称两列复用 col-mode-zh / col-mode-en 两个 class，但「实时数据细分」的宽度被
   #panel-live 覆盖成 160px，下载列走 96px 那条选择器组。
   ============================================================ */
const LIVE_PLATFORM_COLS = 3;
const liveEnM = html.match(/#panel-live \.col-mode-en\s*\{[^}]*width:\s*(\d+)px/);
/* 标准版两列的宽度。两条正则要注意两件事：
   1. 两列现在**等分**，CSS 里写成了一个选择器组
      （`#panel-live .col-std, #panel-live .col-std-alt { width: 136px }`），
      所以类名后面不能直接接 `\s*\{` —— 要允许中间还有别的选择器项（[^{}]*）。
      这与 col-download 那条的处理是同一个道理。
   2. col-std 是 col-std-alt 的前缀，`\.col-std` 会把 `.col-std-alt` 也算上。
      用 (?![-\w]) 锚住完整类名，免得哪天两列宽度又不一样时读错值。 */
const liveStdM = html.match(/#panel-live \.col-std(?![-\w])[^{}]*\{[^}]*width:\s*(\d+)px/);
const liveStdAltM = html.match(/#panel-live \.col-std-alt(?![-\w])[^{}]*\{[^}]*width:\s*(\d+)px/);
/* ⚠️ 这张表的平台列**定宽**，不跟模式表的 PLATFORM_W（122，那是「不定宽、平分剩余空间」
   时的下限）走：三列各自的内容下限是 IoT 72 / 云视界 96 / LiveView 88，取最大加 4px 余量
   = 100，写在 #panel-live .col-platform 里。所以这里从 CSS 读，不写死常量 ——
   改了 CSS 忘了改这里的话，下面 --live-table-w 的期望值就会跟着错，卡不住问题。 */
const livePlatM = html.match(/#panel-live \.col-platform\s*\{[^}]*width:\s*(\d+)px/);
const LIVE_PLATFORM_W = livePlatM ? Number(livePlatM[1]) : NaN;
const liveWidths = [
  { cls: 'col-type', px: widthOf('col-type') },
  { cls: 'col-mode-zh', px: widthOf('col-mode-zh') },
  { cls: 'col-mode-en(#panel-live)', px: liveEnM ? Number(liveEnM[1]) : NaN },
  { cls: 'col-std(#panel-live)', px: liveStdM ? Number(liveStdM[1]) : NaN },
  { cls: 'col-std-alt(#panel-live)', px: liveStdAltM ? Number(liveStdAltM[1]) : NaN },
  { cls: 'col-download', px: dlM ? Number(dlM[1]) : NaN },
];
const liveSum = liveWidths.reduce((s, w) => s + w.px, 0);
const liveExpected = liveSum + LIVE_PLATFORM_COLS * LIVE_PLATFORM_W;
const liveDeclared = Number((html.match(/--live-table-w:\s*(\d+)px/) || [])[1]);

/* colgroup 要取 panel-live 那一张表的，不能再用 html.indexOf('<colgroup>')
   —— 那个是模式表的（panel-modes 在文档里更靠前）。 */
const livePanel = html.slice(html.indexOf('id="panel-live"'));
const liveColgroup = livePanel.slice(livePanel.indexOf('<colgroup>'), livePanel.indexOf('</colgroup>'));
const liveColCount = [...liveColgroup.matchAll(/<col\b[^>]*>/g)]
  .reduce((n, m) => n + Number((m[0].match(/span="(\d+)"/) || [, 1])[1]), 0);

console.log('\n其他实时数据表列宽');
for (const w of liveWidths) console.log(`  ${w.cls.padEnd(22)} ${String(w.px).padStart(4)}px`);
console.log(`  ${'定宽列合计'.padEnd(20)} ${String(liveSum).padStart(4)}px`);
console.log(`  平台列 ${LIVE_PLATFORM_COLS} × ${LIVE_PLATFORM_W}px = ${LIVE_PLATFORM_COLS * LIVE_PLATFORM_W}px（定宽）`);
console.log(`  --live-table-w   声明 ${liveDeclared}px / 应为 ${liveExpected}px`);
console.log(`  colgroup 覆盖列数 ${liveColCount}（应为 ${liveWidths.length + LIVE_PLATFORM_COLS}）`);

if (liveWidths.some((w) => Number.isNaN(w.px))) {
  problems.push(`CSS 里找不到列宽：${liveWidths.filter((w) => Number.isNaN(w.px)).map((w) => w.cls).join(', ')}`);
}
if (Number.isNaN(LIVE_PLATFORM_W)) {
  problems.push('CSS 里找不到 #panel-live .col-platform 的定宽 —— 这张表的平台列必须定宽，'
    + '不定宽的话表格会被 width 摊满整页（见那条规则的注释）');
}
/* 这张表是「列宽之和就是表宽」，所以表格不能再是 width: 100%。
   这一条卡的是那次改动别被无意改回去。 */
if (!/#panel-live table \{[^}]*width:\s*auto/.test(html)) {
  problems.push('#panel-live table 应为 width: auto —— 写成 100% 会把多出来的宽度摊给平台列');
}
if (liveDeclared !== liveExpected) {
  problems.push(`--live-table-w 应为 ${liveExpected}px，实际 ${liveDeclared}px —— 加列或改列宽后忘了同步`);
}
if (liveColCount !== liveWidths.length + LIVE_PLATFORM_COLS) {
  problems.push(`其他实时数据表的 colgroup 覆盖 ${liveColCount} 列，应为 ${liveWidths.length + LIVE_PLATFORM_COLS} 列`);
}

if (problems.length) {
  console.log('\n列宽校验未通过：');
  for (const p of problems) console.log('  ! ' + p);
  process.exitCode = 1;
} else {
  console.log('  列宽自洽（两张表）');
}
