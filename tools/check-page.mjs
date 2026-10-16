/* ============================================================
   页面校验（一次性，不参与构建）
   在 jsdom 里真正把 index.html 跑起来，检查：
     · 脚本无运行时报错
     · 表格渲染出的行数与标准版各档数量
     · 标准版筛选菜单的选项与计数
     · 每个「自动引用 / 外部引用」筛选切下来的行确实只含对应来源
     · 新增的 16 个图标都渲染出了 svg，且外部引用的那 6 个是单条 path、
       不带 fill-rule（绕向已重排成非零）
   用法：cd tools && node check-page.mjs
   ============================================================ */

import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push(e.message));
vc.on('error', (m) => errors.push(String(m)));

/* url 必须给一个真实 origin：about:blank 是 opaque origin，jsdom 不提供 localStorage，
   争议标记的持久化就测不到（功能本身会走 try/catch 降级，见文件末尾那项检查）。 */
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  virtualConsole: vc,
  pretendToBeVisual: true,
  url: 'http://localhost/',
});
const { document } = dom.window;

const fail = [];
const ok = (cond, msg) => { if (!cond) fail.push(msg); };

if (errors.length) fail.push('脚本运行时报错：\n  ' + errors.join('\n  '));

/* ---- CSS 变量声明 ----
   CSS 自定义变量没声明时，var() 不报错也不留痕：属性变成「计算值时无效」，
   color 这类可继承属性会退回继承值。实际踩过两次 ——
     --brand-color-disabled      IoT 列「已锁门 / 轿门状态 --」的图标退成正文黑
     --bg-color-component-hover  表头筛选按钮 hover 一直没底色
   两处都看不出是变量问题，所以在这里把「用到但没声明」的变量列成硬失败。
   带兜底值的 var(--x, fallback) 不算问题。 */
const declaredVars = new Set([...html.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
const usedVars = new Map();
for (const m of html.matchAll(/var\((--[\w-]+)([^)]*)\)/g)) {
  if (!usedVars.has(m[1])) usedVars.set(m[1], !!m[2].trim());
}
const undeclaredVars = [...usedVars.entries()]
  .filter(([name, hasFallback]) => !declaredVars.has(name) && !hasFallback)
  .map(([name]) => name);
console.log('CSS 变量                 声明 ' + declaredVars.size + ' / 用到 ' + usedVars.size
  + '，用了没声明且无兜底 ' + undeclaredVars.length);
ok(undeclaredVars.length === 0,
  `这些 CSS 变量用了但没声明（var() 会静默失效）：${undeclaredVars.join(', ')}`);

// ---- 表格 ----
const rows = [...document.querySelectorAll('#tbody tr')];
console.log('渲染行数                ', rows.length);
ok(rows.length === 84, `期望 84 行，实际 ${rows.length}`);

/* 标准版列用 .cell-std 定位，不能再用 td:last-child —— 它右边现在还有一个下载列。 */
const stdCells = rows.map((tr) => tr.querySelector('td.cell-std'));
const emptyCells = stdCells.filter((td) => td.querySelector('.icon-slot[data-state="empty"]'));
const iconCells = stdCells.filter((td) => td.querySelector('.std-mode'));
console.log('标准版 已填充 / 未填充   ', iconCells.length, '/', emptyCells.length);
/* 79 → 80：Evacuation for KCEGC 沿用 Evacuation 那行的 logout，未填充从 5 降到 4。
   图标种类数不变（logout 本来就有行在用）。
   80 → 81：PRL 带后缀那行（IoT 直梯 code 15）按指定填了库内 user-talk，未填充降到 3。
   这次图标种类数 +1（user-talk 之前没有行在用），见下面 renderedNames 那条。
   81 → 82：DOP CS 按指定填了库内 card（605:512），未填充降到 2 —— 现在只剩 RES E / H4。
   这次图标种类数同样 +1（card 是新条目，之前没有行在用）。 */
// 82 → 83 / 2 → 1：RES E 于 2026-10 按要求填了库内 alarm，只剩 H4 一行空着
ok(iconCells.length === 83, `标准版已填充期望 83，实际 ${iconCells.length}`);
ok(emptyCells.length === 1, `标准版未填充期望 1，实际 ${emptyCells.length}`);

// ---- 筛选菜单 ----
const btn = document.getElementById('stdFilterBtn');
btn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const items = [...document.querySelectorAll('#stdFilterMenu .th-filter__item')];
/* 菜单项的结构是 check / label / count 三个 span，label 那个没有 class，
   所以按位置取第二个 span，不要拿整个按钮的 textContent（会把计数拼进去）。 */
const labelOf = (it) => it.querySelectorAll('span')[1]?.textContent.trim() || '';
const countOf = (it) => it.querySelector('.th-filter__count')?.textContent.trim() || '?';

console.log('\n筛选选项');
for (const it of items) console.log('  ' + labelOf(it).padEnd(10) + countOf(it));

const labels = items.map(labelOf);
const WANT_FILTERS = ['全部', '已填充', '未填充', '新增/待确认'];
for (const want of WANT_FILTERS) {
  ok(labels.includes(want), `筛选菜单缺少选项「${want}」`);
}
// 按要求只保留这四项，多出来的也要报 —— 否则以后误加了档不会被发现
ok(labels.length === WANT_FILTERS.length,
  `筛选选项应恰好 ${WANT_FILTERS.length} 项（${WANT_FILTERS.join('/')}），实际 ${labels.length} 项：${labels.join('/')}`);

// ---- 逐个筛选项切换，核对筛出来的行 ----
/* 菜单是每次打开时整段重渲染的，所以不能复用一开始拿到的 items 引用，
   每次都要重新打开菜单再查当前的 DOM 节点。 */
function selectFilter(label) {
  document.getElementById('stdFilterBtn')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const fresh = [...document.querySelectorAll('#stdFilterMenu .th-filter__item')];
  const item = fresh.find((it) => labelOf(it) === label);
  if (!item) throw new Error(`找不到筛选项 ${label}`);
  item.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return [...document.querySelectorAll('#tbody tr')];
}

console.log('\n筛选结果核对');
for (const [label, expect] of [['全部', 84], ['已填充', 83], ['未填充', 1], ['新增/待确认', 13]]) {
  const got = selectFilter(label);
  const n = got.filter((tr) => !tr.classList.contains('empty-row')).length;
  console.log(`  ${label.padEnd(8)} ${String(n).padStart(3)} 行  (期望 ${expect})`);
  ok(n === expect, `筛选「${label}」期望 ${expect} 行，实际 ${n}`);
}

/* 来源不再是筛选档，但 tooltip 仍是唯一的来源出口，所以这里照样核对：
   8 个库外来源（6 个 TDesign 改造 + 2 个 IOT Delivery）、其余都是库内，
   并且没有拼出 undefined。 */
selectFilter('已填充');
const titles = [...document.querySelectorAll('#tbody td.cell-std .std-mode')]
  .map((el) => el.getAttribute('title') || '');
const isExternal = (t) => /TDesign Icons|IOT Delivery|新画/.test(t);
console.log(`  tooltip 来源  非库内 ${titles.filter(isExternal).length} / 库内 ${titles.filter((t) => !isExternal(t)).length}`);
/* 「非 Design Token 库」来源的行数。改过两轮：
   8 → 7  构建模式 从 IOT Delivery 的 ConstructionMode（安全帽，与 FRD 的 Safety helmet
          撞形）改用库内的 toolbox。
   7 → 9  优先高区 / 优先低区 换成本项目新画的 zone-high / zone-low。
   9 → 8  吊坠 从 TDesign calculator 改造件（pendant）换成库内的 user-maintenance（615:1751）。
   现在的构成：TDesign 改造 1（shaft-learning）
             + IOT Delivery 5（auto_circle、robot、setting-off、relevel、relevel-slow）
             + 新画 2（zone-high、zone-low）= 8。
   ⚠️ 总数在 9 上停过很久，但构成换过四次：robot、setting-off、relevel、relevel-slow 依次从
   「TDesign 改造」挪到了「IOT Delivery」—— 设计在 IOT Delivery 各重画了一张
   （12007:216383 / 216438 / 216476 / 216496）替换掉原来的改造件。
   两种来源都算「非库内」，所以那几次 9 的断言照旧成立；
   换句话说这条断言只盯「有几行不是库内引用」，盯不住来源在非库内之间的挪动，
   来源构成得靠上面这段注释和各条目自己的说明来记。 */
const externalTitles = [...titles.filter((t) => /TDesign Icons|IOT Delivery|新画/.test(t))];
ok(externalTitles.length === 8, `非库内来源期望 8 行，实际 ${externalTitles.length}`);
for (const t of titles) if (/undefined/.test(t)) fail.push(`tooltip 里有 undefined：${t}`);
selectFilter('全部');

// ---- 新增图标的渲染与规范符合性 ----
selectFilter('全部');
/* 库内引用的那批不在这里逐个列名 —— 选型一直在调整，写死名单等于每次换图标都要改测试；
   下面改成「页面上渲染出来的每一个标准版图标都过一遍基本检查」，名单从页面自己取。 */
/* 走 tools/normalize-icon.mjs 流水线出来的图标，都要满足更严的一档：
   单条 path、viewBox 0 0 16 16、不依赖 evenodd。
   第 1 个是 TDesign 素材改造，后 2 个是本项目新画 —— 新画的没有理由少走校验，
   所以一并放进来（名字里的 external 是历史叫法，现在的含义是「非库内引用」）。
   ⚠️ robot、setting-off、relevel、relevel-slow 都已从这份名单移出：它们换成了设计在
   IOT Delivery 画的版本（12007:216383 / 216438 / 216476 / 216496），
   分别是 6 / 5 / 3 / 5 条 path，robot 那条还带 evenodd —— 都不是流水线产物，
   这三条更严的规矩对它们不成立，它们按下面「名单取自页面」那一轮的通用检查过
   （path 存在、currentColor、16 单位画框）。
   移出的理由必须是「来源变了」，不能是「校验挂了就删名单」：
   如果哪天有人把它们改回流水线产物，记得加回来。 */
/* pendant 也已移出：吊坠换成了库内的 user-maintenance（615:1751），不再是流水线产物 */
const STRICT_EXTERNAL = ['shaft-learning',
  'zone-high', 'zone-low'];

const byName = new Map();
for (const tr of document.querySelectorAll('#tbody tr')) {
  const cell = tr.querySelector('td.cell-std .std-mode');
  if (!cell) continue;
  const name = cell.querySelector('.std-mode__label')?.textContent?.trim();
  if (name) byName.set(name, cell);
}

console.log('\n标准版图标渲染（名单取自页面）');
const renderedNames = [...byName.keys()].sort();
/* 按 icon 名去重后的个数，两次选型调整各减一个：
   61 → 60  OSS Pending 从 minus-circle-filled 换成 minus-circle，与 退出服务 四行同名。
            页面里 minus_circle / minus_circle_oss 是同字形副本，分开只为让争议黄点
            单独落在 OSS Pending 这一行上。
   60 → 59  故障状态 从 close-circle 换成 warning-triangle（与 ETSL / NTS 同名），
            close-circle 随之没有行在用；同批的 启动模式 stop play → play-1 是
            一换一，不影响个数。
   59 → 60  PRL 带后缀那行（原来是空槽）按指定填了库内 user-talk，是个新字形，
            不与任何已在用的图标同名，所以种类数 +1。
   60 → 61  DOP CS（原来是空槽）按指定填了库内 card，同样是个新字形，种类数再 +1。 */
/* 61 → 62（2026-10）：+clock（分配）+user-avatar（访客）+alarm（RES E）−refresh-1（自动改用 Auto）−user（访客换掉） */
ok(renderedNames.length === 62, `标准版图标应有 62 个不同的，实际 ${renderedNames.length}`);
for (const name of renderedNames) {
  const cell = byName.get(name);
  const svg = cell.querySelector('svg');
  const paths = svg ? svg.querySelectorAll('path') : [];
  const vb = svg?.getAttribute('viewBox') || '';
  const allCurrentColor = [...paths].every((p) => p.getAttribute('fill') === 'currentColor');
  ok(paths.length > 0, `${name} 没渲染出 path`);
  ok(allCurrentColor, `${name} 有 path 没用 currentColor`);
  ok(/ 16 16$/.test(vb), `${name} 的 viewBox 应是 16 单位画框，实际 ${vb}`);
}
console.log('  ' + renderedNames.length + ' 个图标：path / currentColor / 16 单位画框 全部通过');

/* 「其他实时数据图标」表的标准版列用的是另一份图标表（LIVE_STD_ICONS）：
   一半引自 STD_ICONS / LIFT_ICONS，一半是单独从 💰Icon 页取的。
   这里按同一套规矩查一遍 —— path 存在、fill 全是 currentColor、viewBox 是 16 单位画框。 */
const liveStdCells = [...document.querySelectorAll('#tbodyLive td.cell-std .std-mode')];
console.log('\n其他实时数据表的标准版列');
console.log('  填了图标的行  ' + liveStdCells.length);
ok(liveStdCells.length > 0, '其他实时数据表的标准版列一个图标都没渲染出来');
const liveStdNames = new Set();
for (const cell of liveStdCells) {
  const name = cell.querySelector('.std-mode__label')?.textContent.trim() || '(无名)';
  liveStdNames.add(name);
  const svg = cell.querySelector('svg');
  const paths = svg ? svg.querySelectorAll('path') : [];
  const vb = svg?.getAttribute('viewBox') || '';
  ok(paths.length > 0, `标准版(实时数据) ${name} 没渲染出 path`);
  ok([...paths].every((p) => p.getAttribute('fill') === 'currentColor'),
    `标准版(实时数据) ${name} 有 path 没用 currentColor`);
  ok(/ 16 16$/.test(vb), `标准版(实时数据) ${name} 的 viewBox 应是 16 单位画框，实际 ${vb}`);
}
console.log('  去重后图标   ' + [...liveStdNames].sort().join(', '));
console.log('  path / currentColor / 16 单位画框 全部通过');

for (const name of STRICT_EXTERNAL) {
  const cell = byName.get(name);
  if (!cell) { fail.push(`页面上找不到外部改造图标 ${name}`); continue; }
  const svg = cell.querySelector('svg');
  const paths = svg.querySelectorAll('path');
  const vb = svg.getAttribute('viewBox');
  const hasEvenOdd = [...paths].some((p) => p.getAttribute('fill-rule') === 'evenodd');
  console.log(`  ${name.padEnd(16)} viewBox=${vb.padEnd(12)} path×${paths.length}  evenodd=${hasEvenOdd ? 'yes' : 'no'}`);
  ok(vb === '0 0 16 16', `${name} 外部引用的 viewBox 应为 0 0 16 16，实际 ${vb}`);
  ok(paths.length === 1, `${name} 外部引用应合并成单条 path，实际 ${paths.length} 条`);
  ok(!hasEvenOdd, `${name} 外部引用不应依赖 evenodd`);
}
console.log();
if (fail.length) {
  console.log('校验未通过：');
  for (const f of fail) console.log('  ! ' + f);
  process.exitCode = 1;
} else {
  console.log('全部校验通过');
}

/* ============================================================
   争议标记的手动切换
   覆盖：默认态、点亮未标注的行、熄灭自动判定的行、切回自动值时覆盖被删除、
         未填充的格也有按钮、筛选计数跟着变、localStorage 落盘、全部清除
   ============================================================ */
console.log('\n争议标记');

/* 按 data 属性遍历取，不用选择器 —— 行标识里有 * / ( ) 这些字符，
   放进属性选择器要转义，而 jsdom 没有 window.CSS.escape。
   ⚠️ 这一段所有的 .dispute-dot 查询都要带 #tbody 作用域：
   「其他实时数据图标」表的标准版列现在也有自己的争议标记
   （data-dispute-live，另一份 localStorage），不限定的话两张表的点会混在
   一起数，按钮总数会变成 84 + 44。 */
const dotOf = (rowKey) => [...document.querySelectorAll('#tbody .dispute-dot')]
  .find((el) => el.getAttribute('data-dispute-row') === rowKey);
const litDots = () => [...document.querySelectorAll('#tbody .dispute-dot[aria-pressed="true"]')];
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const disputedCount = () => {
  document.getElementById('stdFilterBtn')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const it = [...document.querySelectorAll('#stdFilterMenu .th-filter__item')]
    .find((x) => labelOf(x) === '新增/待确认');
  const n = Number(it.querySelector('.th-filter__count').textContent.trim());
  document.getElementById('stdFilterBtn')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return n;
};

// 每一行都该有按钮，含未填充的 2 行
const allDots = [...document.querySelectorAll('#tbody .dispute-dot')];
console.log('  按钮总数              ', allDots.length);
ok(allDots.length === 84, `每行都该有一个争议标记按钮，期望 84，实际 ${allDots.length}`);
/* 取一个仍然空着的行。原来这里取的是 DOP CS，它已按指定填了 card，
   所以换成 RES E —— 现在还空着的只有 RES E / H4 两行。 */
// RES E 已填 alarm，现在唯一空着的是 H4
const emptyRowDot = dotOf('H4');
ok(!!emptyRowDot, '未填充的行（H4）也应该有争议标记按钮');

/* 默认 13 个点亮：sales（司机）+ 优先外呼 / 优先内呼 + 降速 + 停止运行 + OSS Pending
   + 优先高区 / 优先低区（本项目新画的 zone-high / zone-low，未过评审）
   + 自动引导 / 未设置 / 井道自学习 / 再平层 / 低速返平层（设计新画或外部改造，未过评审）。
   原来是 14：吊坠换成库内 user-maintenance 之后不再打点。
   全都是自动判定，没有 --manual。 */
console.log('  默认点亮              ', litDots().length, '（筛选计数', disputedCount(), '）');
ok(litDots().length === 13, `默认应有 13 个点亮，实际 ${litDots().length}`);
ok(disputedCount() === 13, '默认「新增/待确认」筛选计数应为 13');
ok(dotOf('Pendant')?.getAttribute('aria-pressed') === 'false', '吊坠换成库内 user-maintenance 后默认不该再打点');
ok(!document.querySelector('#tbody .dispute-dot--manual'), '默认不应有手动标注');

// A 点亮一个原本没标记的行
click(dotOf('Normal Service'));
let d = dotOf('Normal Service');
console.log('  点亮 Normal Service   ', 'aria-pressed=' + d.getAttribute('aria-pressed'),
  '手动=' + d.classList.contains('dispute-dot--manual'), '计数', disputedCount());
ok(d.getAttribute('aria-pressed') === 'true', '点击后 Normal Service 应点亮');
ok(d.classList.contains('dispute-dot--manual'), '手动点亮的点应带 --manual 标识');
ok(disputedCount() === 14, `点亮后计数应为 14，实际 ${disputedCount()}`);

// B 熄灭一个自动判定的行
click(dotOf('Attendant Service (ATS)'));
d = dotOf('Attendant Service (ATS)');
console.log('  熄灭 ATS（自动判定）   ', 'aria-pressed=' + d.getAttribute('aria-pressed'), '计数', disputedCount());
ok(d.getAttribute('aria-pressed') === 'false', '自动判定的点应该能被手动熄灭');
ok(disputedCount() === 13, `熄灭后计数应为 13，实际 ${disputedCount()}`);

// localStorage 里应该有两条覆盖
let stored = JSON.parse(dom.window.localStorage.getItem('modes-icons.disputeOverrides.v1'));
console.log('  已落盘覆盖            ', JSON.stringify(stored));
ok(stored['Normal Service'] === true && stored['Attendant Service (ATS)'] === false,
  'localStorage 应记下两条覆盖');

// C 把手动点亮的那条切回去 → 与自动值一致，覆盖应被删除而不是存成同值
click(dotOf('Normal Service'));
stored = JSON.parse(dom.window.localStorage.getItem('modes-icons.disputeOverrides.v1'));
console.log('  切回后覆盖            ', JSON.stringify(stored), '计数', disputedCount());
ok(!('Normal Service' in stored), '切回自动值后应删除覆盖，而不是存一条同值记录');
ok(disputedCount() === 12, `此时计数应为 12，实际 ${disputedCount()}`);

// D 在「新增/待确认」筛选下熄灭一行，该行应从结果里消失
let got = selectFilter('新增/待确认');
const before = got.filter((tr) => !tr.classList.contains('empty-row')).length;
click(dotOf('井道自学习'));
got = [...document.querySelectorAll('#tbody tr')];
const after = got.filter((tr) => !tr.classList.contains('empty-row')).length;
console.log('  新增/待确认筛选下熄灭一行  ', before, '→', after);
ok(after === before - 1, `在新增/待确认筛选下熄灭一行应少一行，实际 ${before} → ${after}`);
ok(!dotOf('井道自学习'), '熄灭的行应已从新增/待确认筛选结果中移除');

// E 全部清除
selectFilter('全部');
document.getElementById('stdFilterBtn')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const resetBtn = document.querySelector('#stdFilterMenu .th-filter__reset');
console.log('  清除入口文案          ', resetBtn ? resetBtn.textContent.trim() : '(无)');
ok(!!resetBtn, '有手动标记时菜单底部应出现清除入口');
click(resetBtn);
console.log('  清除后点亮            ', litDots().length, '（筛选计数', disputedCount(), '）');
ok(litDots().length === 13, `清除后应回到 13 个点亮，实际 ${litDots().length}`);
ok(!document.querySelector('#tbody .dispute-dot--manual'), '清除后不应残留手动标注');

document.getElementById('stdFilterBtn')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
ok(!document.querySelector('#stdFilterMenu .th-filter__reset'),
  '没有手动标记时不该显示清除入口');
document.getElementById('stdFilterBtn')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

/* F 没有 localStorage 时要降级可用而不是整页崩。
   这不是假想场景：这个页面平时是用 file:// 直接打开的，
   Safari 对 file:// origin 的 localStorage 有限制，隐私模式也可能禁掉。
   用 about:blank（opaque origin，jsdom 不给 localStorage）模拟。 */
{
  const errs = [];
  const v2 = new VirtualConsole();
  v2.on('jsdomError', (e) => errs.push(e.message));
  const noStore = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: v2, pretendToBeVisual: true });
  const doc2 = noStore.window.document;
  const rows2 = doc2.querySelectorAll('#tbody tr').length;
  const dots2 = doc2.querySelectorAll('#tbody .dispute-dot').length;
  const first = [...doc2.querySelectorAll('#tbody .dispute-dot')]
    .find((el) => el.getAttribute('data-dispute-row') === 'Normal Service');
  first.dispatchEvent(new noStore.window.MouseEvent('click', { bubbles: true }));
  const litAfter = doc2.querySelectorAll('#tbody .dispute-dot[aria-pressed="true"]').length;
  console.log(`  无 localStorage 环境   渲染 ${rows2} 行 / ${dots2} 个按钮，点击后点亮 ${litAfter}，报错 ${errs.length}`);
  ok(errs.length === 0, `无 localStorage 时不应报错：${errs.join('; ')}`);
  ok(rows2 === 84 && dots2 === 84, '无 localStorage 时表格仍应正常渲染');
  ok(litAfter === 14, `无 localStorage 时切换仍应生效（本次会话内），期望 14，实际 ${litAfter}`);
  noStore.window.close();
}

/* G 自动判定与手动标注必须长得一样。
   jsdom 的 getComputedStyle 对伪元素和复杂级联不可靠，所以直接查 CSS 源：
   只要没有任何规则给 dispute-dot--manual 声明样式，两者的外观就必然一致。
   顺带确认熄灭态的描边 hover 已经用 :not() 排除了点亮态 ——
   不排除的话 :hover 那条会压过 --on，橙点里会被描一圈灰边。 */
{
  const css = html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
  const rules = css
    .replace(/\/\*[\s\S]*?\*\//g, '')          // 去注释，免得注释里提到类名被误判
    .split('}')
    .map((chunk) => {
      const i = chunk.indexOf('{');
      return i === -1 ? null : { sel: chunk.slice(0, i).trim(), body: chunk.slice(i + 1).trim() };
    })
    .filter(Boolean);

  const manualRules = rules.filter((r) => r.sel.includes('dispute-dot--manual') && r.body);
  console.log('  手动标注专属样式规则  ', manualRules.length,
    manualRules.length ? JSON.stringify(manualRules.map((r) => r.sel)) : '（无，与自动判定同样式）');
  ok(manualRules.length === 0,
    `手动标注不该有专属样式，否则与自动判定看起来不一样：${manualRules.map((r) => r.sel).join(', ')}`);

  const ringHover = rules.filter((r) => /dispute-dot[^,{]*:hover::after/.test(r.sel));
  console.log('  熄灭态描边 hover 规则 ', JSON.stringify(ringHover.map((r) => r.sel)));
  ok(ringHover.length > 0 && ringHover.every((r) => r.sel.includes(':not(.dispute-dot--on)')),
    '描边 hover 必须用 :not(.dispute-dot--on) 限定到熄灭态，否则点亮的橙点 hover 会被描灰边');
}

console.log();
if (fail.length) {
  console.log('争议标记校验未通过：');
  for (const f of fail) console.log('  ! ' + f);
  process.exitCode = 1;
} else {
  console.log('争议标记校验通过');
}

/* ============================================================
   注释列
   覆盖：列位置与表头对齐、默认全空、加号→弹窗→确认→对话图标、
         气泡内容、再次点击进入编辑、删除、落盘、切 tab 收浮层
   ============================================================ */
/* 模式图标表第一行表头，下载列与注释列两段都要用，所以抽成函数。
   作用域必须限定在 #panel-modes —— 页面里还有「梯型 / 功能图标」那张表的表头，
   不限定的话两张表会混在一起（实测总列数会算成 18）。 */
function headRow1Raw() {
  return [...document.querySelectorAll('#panel-modes thead tr:first-child th')].map((th) => ({
    text: th.textContent.replace(/\s+/g, ' ').trim(),
    colspan: Number(th.getAttribute('colspan') || 1),
    rowspan: Number(th.getAttribute('rowspan') || 1),
  }));
}

/* ============================================================
   模式图标表的下载列
   与「梯型 / 功能图标」表同一套样式和同一套导出逻辑，这里盯三件事：
     1. 只有填了标准版图标的行才有按钮（未填充的 2 行给占位符，不给禁用按钮）
     2. 按钮在标准版列右边，且表头是 rowspan=2 的「下载」
     3. 点下去真的产出一个文件：文件名对、SVG 内容里的 currentColor 换成了 #141414
   第 3 条要 stub 掉 URL.createObjectURL —— jsdom 没有实现它，
   而且就算实现了也拿不到 Blob 的内容，所以直接截获 Blob 自己读。
   ============================================================ */
console.log('\n下载列（模式图标表）');
{
  const dlFail = [];
  const okD = (cond, msg) => { if (!cond) dlFail.push(msg); };

  selectFilter('全部');
  const dlCells = [...document.querySelectorAll('#tbody tr td.cell-download')];
  const withBtn = dlCells.filter((td) => td.querySelector('.dl-btn'));
  const btns = [...document.querySelectorAll('#tbody .dl-btn')];
  console.log('  下载格 / 有按钮的 / 按钮数', dlCells.length, '/', withBtn.length, '/', btns.length);
  okD(dlCells.length === 84, `每行都该有下载格，期望 84，实际 ${dlCells.length}`);
  okD(withBtn.length === 83, `只有已填充的 83 行该有按钮，实际 ${withBtn.length}`);
  okD(btns.length === 83 * 2, `SVG + PNG 两个按钮，期望 ${83 * 2}，实际 ${btns.length}`);

  // 未填充的行：有格子、没按钮
  const emptyRowDl = [...document.querySelectorAll('#tbody tr')]
    .find((tr) => tr.querySelector('td.cell-std .icon-slot[data-state="empty"]'));
  okD(emptyRowDl && emptyRowDl.querySelector('td.cell-download'), '未填充的行也该有下载格');
  okD(emptyRowDl && !emptyRowDl.querySelector('td.cell-download .dl-btn'),
    '未填充的行不该有下载按钮');

  /* 标准版还空着的行要沉到全表最底下（buildRows 的 stdRank 是排序第一级）。
     判据写成「空行的下标必须是连续的一段、且贴着末尾」，不写死具体是哪几行 ——
     选型一直在动，哪天某一行定了图标，名单就会变，但「空的在最后」这条不变。 */
  const emptyIdx = [];
  [...document.querySelectorAll('#tbody tr')].forEach((tr, i) => {
    if (tr.querySelector('td.cell-std .icon-slot[data-state="empty"]')) emptyIdx.push(i);
  });
  const rowCount = document.querySelectorAll('#tbody tr').length;
  const tailStart = rowCount - emptyIdx.length;
  const isTail = emptyIdx.every((v, k) => v === tailStart + k);
  console.log('  未填充行的位置        ', emptyIdx.join(','), `（共 ${rowCount} 行）`);
  okD(emptyIdx.length === 1, `未填充应为 1 行，实际 ${emptyIdx.length}`);
  okD(isTail, `未填充的行应连续排在最后，实际下标 ${emptyIdx.join(',')} / 共 ${rowCount} 行`);

  // 列序：标准版在下载左边
  const lastTwo = [...document.querySelectorAll('#tbody tr:first-child td')].slice(-2);
  console.log('  末两列                ', lastTwo.map((td) => td.className).join(' | '));
  okD(lastTwo[0] && lastTwo[0].classList.contains('cell-std'), '倒数第二列应是标准版');
  okD(lastTwo[1] && lastTwo[1].classList.contains('cell-download'), '最后一列应是下载');
  const dlHead = headRow1Raw().find((h) => h.text === '下载');
  console.log('  表头「下载」          ', dlHead ? `rowspan=${dlHead.rowspan}` : '(没有)');
  okD(!!dlHead, '表头里没有「下载」列');
  okD(dlHead && dlHead.rowspan === 2, '「下载」表头应 rowspan=2');

  /* 真的点一下，把产出的文件内容捞出来。
     ⚠️ 不能用 blob.text() —— jsdom 的 Blob 没实现它（也没有 arrayBuffer）。
     所以直接把 Blob 换成一个只记住入参的壳：saveBlob 之后只会把它交给
     URL.createObjectURL，而那个也已经被 stub 掉了，不会真的用到 Blob 的能力。 */
  const saved = [];
  const RealBlob = dom.window.Blob;
  dom.window.Blob = function (parts, opts) {
    this.parts = parts;
    this.type = opts && opts.type;
    saved.push(this);
  };
  dom.window.URL.createObjectURL = () => 'blob:stub';
  dom.window.URL.revokeObjectURL = () => {};
  const origClick = dom.window.HTMLAnchorElement.prototype.click;
  const names = [];
  dom.window.HTMLAnchorElement.prototype.click = function () { names.push(this.download); };

  const stdRow = [...document.querySelectorAll('#tbody tr')]
    .find((tr) => (tr.textContent || '').includes('Normal Service'));
  const svgBtn = stdRow.querySelector('.dl-btn[data-dl="svg"]');
  svgBtn.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const text = saved.length ? String(saved[0].parts.join('')) : '';
  console.log('  点 SVG 后             ', JSON.stringify(names[0]), '· 内容',
    text.slice(0, 46).replace(/\n/g, ' ') + '…');
  okD(names[0] === 'check-rectangle.svg',
    `文件名应是库里的图标名，期望 check-rectangle.svg，实际 ${names[0]}`);
  okD(/^<svg xmlns=/.test(text), '导出的应是一个独立 SVG 文件');
  okD(/#141414/.test(text) && !/currentColor/.test(text),
    '导出时 currentColor 必须换成 #141414，否则脱离 CSS 环境会退化成浏览器默认黑');
  okD(/viewBox="/.test(text), '导出的 SVG 应保留原始 viewBox');

  dom.window.HTMLAnchorElement.prototype.click = origClick;
  dom.window.Blob = RealBlob;

  console.log();
  if (dlFail.length) {
    console.log('下载列校验未通过：');
    for (const f of dlFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('下载列校验通过');
  }
}

/* ============================================================
   下载列（其他实时数据图标表）
   与另外两张表同一套样式和同一套导出逻辑，但按钮挂的是 LIVE_STD_ICONS 的键
   （data-live），不是行标识 —— 这张表的一行可能有两个并存的候选，
   按行取不出唯一一张图（见 index.html 里 liveDownloadCell 的注释）。
   盯四件事：
     1. 每行都有下载格，且填了标准版的行都有按钮
     2. 按钮数 = 标准版图标数 × 2（两候选的行有两组，所以不是行数 × 2）
     3. 两候选的行输出 .dl-group，两组按钮的键与那两格的图标一一对应
     4. 点下去真的产出文件：文件名是库里的图标名，currentColor 换成了 #141414
   ============================================================ */
console.log('\n下载列（其他实时数据图标表）');
{
  const liveFail = [];
  const okL = (cond, msg) => { if (!cond) liveFail.push(msg); };

  const liveRows = [...document.querySelectorAll('#tbodyLive tr')];
  const liveDl = liveRows.map((tr) => tr.querySelector('td.cell-download'));
  const liveBtns = [...document.querySelectorAll('#tbodyLive .dl-btn')];
  /* 标准版格是 colspan="2"，所以「有图标的格数」不等于行数；
     按钮是按图标给的，要拿图标数来对。 */
  const liveIcons = document.querySelectorAll('#tbodyLive td.cell-std .std-mode').length;
  console.log('  行数 / 下载格 / 标准版图标数', liveRows.length, '/', liveDl.filter(Boolean).length, '/', liveIcons);
  console.log('  按钮数 / 两组的格      ', liveBtns.length, '/', document.querySelectorAll('#tbodyLive .dl-group').length);
  okL(liveDl.every(Boolean), '每行都该有下载格（缺格会把行高压扁，也会让这一列对不齐）');
  okL(liveBtns.length === liveIcons * 2,
    `按钮数应是标准版图标数的两倍（SVG + PNG），期望 ${liveIcons * 2}，实际 ${liveBtns.length}`);

  // 列序：标准版在下载左边（与另外两张表一致）
  const liveLast = [...liveRows[0].children].slice(-2);
  console.log('  首行末两列             ', liveLast.map((td) => td.className).join(' | '));
  okL(liveLast[0] && liveLast[0].classList.contains('cell-std'), '倒数第二列应是标准版');
  okL(liveLast[1] && liveLast[1].classList.contains('cell-download'), '最后一列应是下载');

  /* 标准版还空着的行给占位符、不给禁用按钮（理由见 liveDownloadCell）。
     目前 42 行全都填了图标，所以这里是「若有空行则必须是占位符」，
     不写死条数 —— 将来加了没定图标的行，这条自动生效。 */
  for (const tr of liveRows) {
    if (tr.querySelector('td.cell-std .std-mode')) continue;
    const td = tr.querySelector('td.cell-download');
    okL(td && !td.querySelector('.dl-btn') && td.querySelector('.cell-blank'),
      '标准版空着的行，下载格应是占位符而不是按钮');
  }

  /* 两个候选的行：两组按钮上下排，键要与那两格的图标一一对应、顺序一致
     （左格在上）。对应关系错了会导出另一张图，界面上看不出来。 */
  const groups = [...document.querySelectorAll('#tbodyLive .dl-group')];
  okL(groups.length === 2, `两个候选的行目前是 2 行（轿门传感器振动 横向 / 垂直），实际 ${groups.length}`);
  for (const g of groups) {
    const tr = g.closest('tr');
    const labels = [...tr.querySelectorAll('td.cell-std .std-mode__label')].map((e) => e.textContent.trim());
    const keys = [...g.querySelectorAll('.dl-btn[data-dl="svg"]')].map((b) => b.dataset.live);
    const titles = [...g.querySelectorAll('.dl-btn[data-dl="svg"]')].map((b) => b.title);
    console.log('  两候选行               ' + labels.join(' | ') + '  ←  ' + keys.join(' | '));
    okL(keys.length === labels.length,
      `两候选的行应有 ${labels.length} 组按钮，实际 ${keys.length}`);
    // title 里写的是图标名，正好可以用来核对「第 n 组按钮对第 n 格图标」
    labels.forEach((name, i) => {
      okL(titles[i] === '下载 ' + name + '.svg',
        `第 ${i + 1} 组按钮应对应第 ${i + 1} 格图标（${name}），实际 title 是「${titles[i]}」`);
    });
  }

  // 真的点一下（stub 方式同上一段）
  const saved = [];
  const RealBlob = dom.window.Blob;
  dom.window.Blob = function (parts, opts) {
    this.parts = parts;
    this.type = opts && opts.type;
    saved.push(this);
  };
  dom.window.URL.createObjectURL = () => 'blob:stub';
  dom.window.URL.revokeObjectURL = () => {};
  const origClick = dom.window.HTMLAnchorElement.prototype.click;
  const names = [];
  dom.window.HTMLAnchorElement.prototype.click = function () { names.push(this.download); };

  const b0 = document.querySelector('#tbodyLive .dl-btn[data-dl="svg"]');
  const wantName = b0.closest('tr').querySelector('td.cell-std .std-mode__label').textContent.trim();
  b0.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const liveText = saved.length ? String(saved[0].parts.join('')) : '';
  console.log('  点第一个 SVG 后        ', JSON.stringify(names[0]), '· 内容',
    liveText.slice(0, 46).replace(/\n/g, ' ') + '…');
  okL(names[0] === wantName + '.svg',
    `文件名应是库里的图标名，期望 ${wantName}.svg，实际 ${names[0]}`);
  okL(/^<svg xmlns=/.test(liveText), '导出的应是一个独立 SVG 文件');
  okL(/#141414/.test(liveText) && !/currentColor/.test(liveText),
    '导出时 currentColor 必须换成 #141414（与另外两张表同一套导出函数，口径要一致）');
  okL(/viewBox="/.test(liveText), '导出的 SVG 应保留原始 viewBox');

  dom.window.HTMLAnchorElement.prototype.click = origClick;
  dom.window.Blob = RealBlob;

  console.log();
  if (liveFail.length) {
    console.log('下载列（实时数据）校验未通过：');
    for (const f of liveFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('下载列（实时数据）校验通过');
  }
}

console.log('\n注释列');

const noteFail = [];
const okN = (cond, msg) => { if (!cond) noteFail.push(msg); };

// --- 结构：注释列应在「英文」之后、「AMC（参考）」之前 ---
/* 作用域要限定在模式图标那张表 —— 页面里还有「图标/功能」下载表，
   不限定的话 thead 选择器会把两张表的表头混在一起（实测总列数会算成 18）。 */
const headRow1 = headRow1Raw();
console.log('  表头第一行            ', headRow1.map((h) => h.text.split(' ')[0] || '(空)').join(' | '));
const noteHeadIdx = headRow1.findIndex((h) => h.text === '注释');
okN(noteHeadIdx !== -1, '表头里没有「注释」列');
okN(headRow1[noteHeadIdx - 1] && headRow1[noteHeadIdx - 1].text === '模式名称',
  '「注释」应紧跟在「模式名称」右边');
okN(headRow1[noteHeadIdx + 1] && headRow1[noteHeadIdx + 1].text.startsWith('AMC'),
  '「注释」右边应是「AMC（参考）」');
okN(headRow1[noteHeadIdx].rowspan === 2, '「注释」表头应 rowspan=2（它没有子列）');

// 两行表头的列数必须自洽：第二行只补 colspan 组的子列
const span1 = headRow1.reduce((s, h) => s + h.colspan, 0);
const head2 = document.querySelectorAll('#panel-modes thead tr:last-child th').length;
const groupChildren = headRow1.filter((h) => h.colspan > 1).reduce((s, h) => s + h.colspan, 0);
console.log(`  列数自洽              总列 ${span1}，分组子列 ${groupChildren}，第二行 ${head2}`);
okN(span1 === 14, `总列数应为 14，实际 ${span1}`);
okN(head2 === groupChildren, `第二行表头应有 ${groupChildren} 个单元格，实际 ${head2}`);

// 每行的 td/th 数量要等于总列数
const firstRowCells = document.querySelectorAll('#tbody tr:first-child > *').length;
console.log('  首行单元格数          ', firstRowCells);
okN(firstRowCells === 14, `每行应有 14 个单元格，实际 ${firstRowCells}`);

// 空状态那一行的 colspan 要跟着列数走
selectFilter('新增/待确认');
document.getElementById('searchInput').value = '不存在的关键词zzz';
document.getElementById('searchInput').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
const emptyRowCell = document.querySelector('#tbody .empty-row td');
console.log('  空状态行 colspan      ', emptyRowCell ? emptyRowCell.getAttribute('colspan') : '(没触发空状态)');
okN(emptyRowCell && emptyRowCell.getAttribute('colspan') === '14',
  `空状态行 colspan 应为 14，实际 ${emptyRowCell ? emptyRowCell.getAttribute('colspan') : 'N/A'}`);
document.getElementById('searchInput').value = '';
document.getElementById('searchInput').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
selectFilter('全部');

/* --- 预置注释（NOTE_SEEDS）---
   84 行全部预置了行业含义说明，所以默认不是全空。
   全部铺满而不是只填「未填充 + 争议」那 12 行，是因为争议标记可以手动点，
   手动标记只存在本地、代码无从知道 —— 只填 12 行会出现「有黄点没注释」。 */
const noteBtns = () => [...document.querySelectorAll('.note-btn')];
const noteBtnOf = (rowKey) => noteBtns().find((el) => el.getAttribute('data-note-row') === rowKey);

// 浮层的三个节点，下面几组用例都要用，先取出来
const editor = document.getElementById('noteEditor');
const bubble = document.getElementById('noteBubble');
const textarea = document.getElementById('noteEditorText');

const seededNow = noteBtns()
  .filter((b) => b.classList.contains('note-btn--has'))
  .map((b) => b.getAttribute('data-note-row'));
const notSeeded = noteBtns()
  .filter((b) => b.classList.contains('note-btn--add'))
  .map((b) => b.getAttribute('data-note-row'));

console.log('  按钮总数 / 预置注释   ', noteBtns().length, '/', seededNow.length);
okN(noteBtns().length === 84, `每行都该有一个注释按钮，期望 84，实际 ${noteBtns().length}`);
okN(seededNow.length === 84,
  `84 行都该有预置注释，实际 ${seededNow.length} 条；缺的是：${notSeeded.join(', ')}`);

/* 正文长度兜底：预置内容是给人看的说明，几个字的占位等于没写。
   40 字是个粗线，够区分「真写了」和「填了个词」。 */
const tooShort = noteBtns()
  .map((b) => ({
    row: b.getAttribute('data-note-row'),
    len: (b.getAttribute('aria-label') || '').replace(/^注释：/, '').replace(/。点击编辑$/, '').length,
  }))
  .filter((x) => x.len < 40);
console.log('  正文过短（<40 字）    ', tooShort.length,
  tooShort.length ? tooShort.map((x) => `${x.row}(${x.len})`).join(', ') : '');
okN(tooShort.length === 0, `这些行的注释太短，像占位不像说明：${tooShort.map((x) => x.row).join(', ')}`);

/* 凡是公开资料查不到的，必须带【存疑】或【未能确认】标记，不能把猜测写成结论。
   这几个是 KONE 内部缩写，我逐个搜过，确实查不到。 */
const MUST_BE_MARKED = [
  'DOP CS', 'RES E', 'H4', 'PRL H*/HEL/MES',
  'Evacuation for KCEGC', 'OSS Pending for KCEGC',
  'Fast Recall (FRE)', 'Invasion', 'Bar Adjust', 'SCD Setup Drive',
  'FPO Simplex Service', 'Gateway Operation (Main Power Off)', 'RDF',
];
const unmarked = MUST_BE_MARKED.filter((key) => {
  const b = noteBtnOf(key);
  return !b || !/【存疑】|【未能确认】/.test(b.getAttribute('aria-label') || '');
});
console.log('  应标存疑而未标的行    ', unmarked.length, unmarked.join(', '));
okN(unmarked.length === 0,
  `这些是查不到定义的内部缩写，注释里必须带【存疑】或【未能确认】：${unmarked.join(', ')}`);

// 预置注释可编辑：改掉再改回来，覆盖记录应被清掉而不是存一条同值
{
  const K = 'H4';
  const seedText = noteBtnOf(K).getAttribute('aria-label').replace(/^注释：/, '').replace(/。点击编辑$/, '');
  click(noteBtnOf(K));
  textarea.value = '自己改过的内容';
  click(document.getElementById('noteEditorSave'));
  let raw = JSON.parse(dom.window.localStorage.getItem('modes-icons.notes.v1') || '{}');
  okN(raw[K] === '自己改过的内容', '改预置注释应写入本地覆盖');

  click(noteBtnOf(K));
  textarea.value = seedText;
  click(document.getElementById('noteEditorSave'));
  raw = JSON.parse(dom.window.localStorage.getItem('modes-icons.notes.v1') || '{}');
  console.log('  改回预置值后覆盖      ', K in raw ? '!! 仍留着记录' : '已清掉（跟随预置）');
  okN(!(K in raw), '改回与预置相同的内容时，应删掉覆盖而不是存一条同值记录');
  okN(noteBtnOf(K).classList.contains('note-btn--has'), '跟随预置时该格仍应是有注释状态');
}

// 删掉预置注释要留得住（存空串），不能刷新后复活
{
  const K = 'RES E';
  click(noteBtnOf(K));
  click(document.getElementById('noteEditorDelete'));
  const raw = JSON.parse(dom.window.localStorage.getItem('modes-icons.notes.v1') || '{}');
  console.log('  删掉预置注释          ', noteBtnOf(K).className, '· 本地记录', JSON.stringify(raw[K]));
  okN(noteBtnOf(K).classList.contains('note-btn--add'), '删掉预置注释后该格应回到空态加号');
  okN(raw[K] === '', '删掉预置注释必须存一个空串覆盖，否则刷新后会复活');

  /* 真的重开一个页面，确认删除没有被预置值顶回来。
     ⚠️ 每个 JSDOM 实例有各自独立的 localStorage，即便 url 相同 ——
     所以不能「在实例 A 里写、到实例 B 里读」。必须用 beforeParse 在脚本执行**之前**
     把数据塞进去，页面初始化时才读得到。 */
  const v4 = new VirtualConsole();
  const d4 = new JSDOM(html, {
    runScripts: 'dangerously',
    virtualConsole: v4,
    pretendToBeVisual: true,
    url: 'http://localhost/',
    beforeParse(w) {
      w.localStorage.setItem('modes-icons.notes.v1', JSON.stringify(raw));
    },
  });
  const reloaded = [...d4.window.document.querySelectorAll('.note-btn')]
    .find((el) => el.getAttribute('data-note-row') === K);
  console.log('  重载后该格            ', reloaded.className);
  okN(reloaded.classList.contains('note-btn--add'), '重载后被删掉的预置注释不该复活');
  d4.window.close();
}

/* --- 加号 → 弹窗 → 确认 ---
   84 行都有预置注释，所以没有天然为空的行可用；上一组用例把 RES E 的预置注释删掉了，
   正好拿它当空态的被试。

   只断言弹窗已关。气泡这时候可能是开着的，而且是对的：
   保存后焦点回到那一格的按钮，focusin 会把气泡带出来（键盘用户靠这个看内容），
   顺带也是一次「刚保存的内容长这样」的反馈。 */
okN(editor.hidden, '此时编辑弹窗该是隐藏的');

const EMPTY_ROW = 'RES E';
okN(noteBtnOf(EMPTY_ROW).classList.contains('note-btn--add'),
  `准备：${EMPTY_ROW} 应处于空态（上一组用例删掉了它的预置注释）`);

// 计数用相对比较：上面的用例已经改过若干行，绝对值不再是常数
const hasCountBefore = document.querySelectorAll('.note-btn--has').length;
click(noteBtnOf(EMPTY_ROW));
console.log('  点加号后弹窗          ', editor.hidden ? '未打开' : '已打开',
  '· 标题', JSON.stringify(document.getElementById('noteEditorTitle').textContent),
  '· 模式', JSON.stringify(document.getElementById('noteEditorMode').textContent));
okN(!editor.hidden, '点加号应打开编辑弹窗');
okN(document.getElementById('noteEditorTitle').textContent === '添加注释', '空注释时标题应为「添加注释」');
okN(document.getElementById('noteEditorDelete').hidden, '空注释时不该显示删除按钮');
okN(textarea.value === '', '空注释时输入框应为空');

const NOTE_TEXT = 'FRE 的语义待确认\n参见 Confluence Elevator-mode';
textarea.value = NOTE_TEXT;
click(document.getElementById('noteEditorSave'));

const chip = noteBtnOf(EMPTY_ROW);
console.log('  确认后该格            ', chip.className, '· aria-label',
  JSON.stringify(chip.getAttribute('aria-label').slice(0, 24) + '…'));
okN(editor.hidden, '确认后弹窗应关闭');
okN(chip.classList.contains('note-btn--has'), '确认后该格应变成对话图标（note-btn--has）');
okN(!chip.classList.contains('note-btn--add'), '确认后不该再是空态加号');
okN(/chat-1/.test(chip.innerHTML), '有注释的格应渲染 chat-1 图标');
okN(chip.getAttribute('aria-label').includes('FRE 的语义待确认'), '注释内容应进 aria-label 供读屏读取');
okN(!chip.hasAttribute('title'), '有注释时不该再挂原生 title（否则与气泡两层一起冒）');
const hasCountAfter = document.querySelectorAll('.note-btn--has').length;
console.log('  有注释行数            ', hasCountBefore, '→', hasCountAfter);
okN(hasCountAfter === hasCountBefore + 1,
  `新增一条注释应只让有注释的行数 +1，实际 ${hasCountBefore} → ${hasCountAfter}`);

// --- 落盘 ---
const storedNotes = JSON.parse(dom.window.localStorage.getItem('modes-icons.notes.v1'));
console.log('  已落盘                ', JSON.stringify(storedNotes));
okN(storedNotes[EMPTY_ROW] === NOTE_TEXT, 'localStorage 里应存下注释原文（含换行）');

// --- hover 出气泡 ---
chip.dispatchEvent(new dom.window.MouseEvent('mouseover', { bubbles: true }));
console.log('  hover 气泡            ', bubble.hidden ? '未出现' : JSON.stringify(bubble.textContent));
okN(!bubble.hidden, 'hover 有注释的图标应出现气泡');
okN(bubble.textContent === NOTE_TEXT, '气泡内容应是注释原文');
chip.dispatchEvent(new dom.window.MouseEvent('mouseout', { bubbles: true }));
okN(bubble.hidden, '移开鼠标气泡应收起');

// --- 再次点击进入编辑 ---
click(noteBtnOf(EMPTY_ROW));
console.log('  再次点击              ', JSON.stringify(document.getElementById('noteEditorTitle').textContent),
  '· 预填', JSON.stringify(textarea.value.slice(0, 12) + '…'),
  '· 删除按钮', document.getElementById('noteEditorDelete').hidden ? '隐藏' : '显示');
okN(!editor.hidden, '点对话图标应重新打开弹窗');
okN(document.getElementById('noteEditorTitle').textContent === '编辑注释', '有注释时标题应为「编辑注释」');
okN(textarea.value === NOTE_TEXT, '弹窗应预填现有注释');
okN(!document.getElementById('noteEditorDelete').hidden, '有注释时应显示删除按钮');

// Esc 取消：不该改内容
textarea.value = '改了但要取消';
document.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
okN(editor.hidden, 'Esc 应关闭弹窗');
okN(notesOf(EMPTY_ROW) === NOTE_TEXT, 'Esc 取消不该保存改动');

function notesOf(key) {
  const raw = dom.window.localStorage.getItem('modes-icons.notes.v1');
  return raw ? (JSON.parse(raw)[key] || '') : '';
}

// --- 编辑后确认 ---
click(noteBtnOf(EMPTY_ROW));
textarea.value = '已确认：不是消防模式';
click(document.getElementById('noteEditorSave'));
console.log('  编辑后落盘            ', JSON.stringify(notesOf(EMPTY_ROW)));
okN(notesOf(EMPTY_ROW) === '已确认：不是消防模式', '编辑后应覆盖旧内容');

// --- 删除 ---
click(noteBtnOf(EMPTY_ROW));
click(document.getElementById('noteEditorDelete'));
const afterDelete = noteBtnOf(EMPTY_ROW);
console.log('  删除后该格            ', afterDelete.className, '· 落盘', JSON.stringify(notesOf(EMPTY_ROW)));
okN(afterDelete.classList.contains('note-btn--add'), '删除后该格应回到空态加号');
/* 这一行有预置内容，所以删除会存一个空串覆盖（而不是删掉 key）——
   notesOf() 两种情况都返回 ''，这里断言的是「读出来是空」，不是「key 不存在」。 */
okN(notesOf(EMPTY_ROW) === '', '删除后读出来应为空');

// --- 只输空白等于不写：拿一行有预置内容的，用空白把它清掉 ---
click(noteBtnOf('Parked'));
textarea.value = '   \n  ';
click(document.getElementById('noteEditorSave'));
console.log('  只输空白              ', noteBtnOf('Parked').className);
okN(noteBtnOf('Parked').classList.contains('note-btn--add'), '只输空白应视为没有注释，不留空图标');

/* --- 模态形态：蒙层同步 + 粘贴不再被 scroll 打断 ---
   这一组是回归用例，对应两个已修的 bug：
   ① 弹窗原来是贴按钮的小浮层，现在是「蒙层 + 居中大弹窗」，两个节点的 hidden
      必须同步；外部仍然只看 #noteEditor.hidden，所以蒙层漏开漏关不会被别的用例发现。
   ② 原来 window 上有个捕获阶段的 scroll 监听顺手关掉弹窗。捕获阶段会收到
      textarea 自己的滚动事件，于是往里粘贴长文本、内容一超出可见高度，弹窗当场关闭 ——
      现象就是「粘不进去」。这里直接在 textarea 上派发 scroll 来盯住它。 */
{
  const mask = document.getElementById('noteMask');
  click(noteBtnOf('Parked'));
  console.log('  打开后蒙层            ', mask.hidden ? '!! 没出现' : '已出现',
    '· aria-modal', JSON.stringify(editor.getAttribute('aria-modal')));
  okN(!editor.hidden && !mask.hidden, '打开弹窗时蒙层应同时出现');
  okN(editor.getAttribute('aria-modal') === 'true', '模态弹窗应标 aria-modal="true"');

  // 粘贴一段长文本，然后模拟 textarea 因内容超出而滚动
  const PASTED = Array.from({ length: 40 }, (_, i) => `第 ${i + 1} 行粘贴进来的内容`).join('\n');
  textarea.value = PASTED;
  textarea.dispatchEvent(new dom.window.Event('scroll', { bubbles: false }));
  document.dispatchEvent(new dom.window.Event('scroll', { bubbles: false }));
  console.log('  textarea 滚动后弹窗   ', editor.hidden ? '!! 被关掉了' : '仍然打开',
    '· 内容', textarea.value.split('\n').length, '行');
  okN(!editor.hidden, 'textarea 内部滚动不该关闭弹窗（否则粘贴长文本会被打断）');
  okN(textarea.value === PASTED, '滚动后输入框内容不该丢');

  click(document.getElementById('noteEditorSave'));
  okN(notesOf('Parked') === PASTED, '粘贴进来的多行内容应能正常保存');

  // 点蒙层 = 取消；点弹窗内部不该关
  click(noteBtnOf('Parked'));
  click(editor);
  okN(!editor.hidden, '点弹窗内部不该关闭');
  click(mask);
  console.log('  点蒙层后              ', editor.hidden ? '已关闭' : '!! 仍然打开',
    '· 蒙层', mask.hidden ? '已收起' : '!! 还在');
  okN(editor.hidden && mask.hidden, '点蒙层应关闭弹窗并收起蒙层');
  okN(notesOf('Parked') === PASTED, '点蒙层是取消，不该改动已保存内容');

  // 还原这一行，免得影响后面的用例
  click(noteBtnOf('Parked'));
  textarea.value = '还原用的占位内容，长度要够 40 字才不会被前面的「正文过短」用例盯上，这里随便写满。';
  click(document.getElementById('noteEditorSave'));
}

// --- 切 tab 时收浮层 ---
click(noteBtnOf('Parked'));
okN(!editor.hidden, '准备：弹窗应处于打开状态');
document.getElementById('tab-function').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
console.log('  切 tab 后弹窗         ', editor.hidden ? '已收起' : '仍然打开');
okN(editor.hidden, '切换分类应收掉注释弹窗（它在 panel 外面，不会被 hidden 带走）');
document.getElementById('tab-modes').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));

console.log();
if (noteFail.length) {
  console.log('注释列校验未通过：');
  for (const f of noteFail) console.log('  ! ' + f);
  process.exitCode = 1;
} else {
  console.log('注释列校验通过');
}

/* pretendToBeVisual 会挂上 requestAnimationFrame 的定时器，不关窗口进程不退出。 */
dom.window.close();

/* ============================================================
   搜索范围
   要求覆盖 9 类名称：中/英文名、AMC 图标名、KFPS 徽标文字、IoT 模式名、
   MyDeviceView 名称、云视界名称、大屏名称、LiveView 名称、标准版 icon 名称。
   并且确认已按要求移出范围的两项（梯型、高优先级）真的搜不到了。

   注意这里必须新开一个 JSDOM：上面的用例已经把 dom 关掉了，而且改过筛选和注释。
   ============================================================ */
console.log('\n搜索范围');

{
  const v3 = new VirtualConsole();
  const errs = [];
  v3.on('jsdomError', (e) => errs.push(e.message));
  const d3 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v3, pretendToBeVisual: true, url: 'http://localhost/',
  });
  const doc = d3.window.document;
  const input = doc.getElementById('searchInput');

  const searchFail = [];
  const okS = (cond, msg) => { if (!cond) searchFail.push(msg); };

  const search = (kw) => {
    input.value = kw;
    input.dispatchEvent(new d3.window.Event('input', { bubbles: true }));
    const rows = [...doc.querySelectorAll('#tbody tr')].filter((tr) => !tr.classList.contains('empty-row'));
    return rows.map((tr) => tr.querySelector('.mode-en, .mode-zh')?.textContent.trim() || '');
  };

  // 占位文案与宽度
  console.log('  placeholder           ', JSON.stringify(input.getAttribute('placeholder')));
  okS(input.getAttribute('placeholder') === '搜索关键字', 'placeholder 应为「搜索关键字」');
  okS(input.getAttribute('aria-label') === '搜索关键字', 'aria-label 应同步改成「搜索关键字」');
  /* 必须行首锚定 .search{ —— 不锚的话会先撞上 @media 里的
     「.topnav__actions .search { width: 260px }」（它在文件里更靠前），
     量到的是窄屏档而不是基准宽度。 */
  const searchW = (html.match(/^\.search \{[^}]*?width:\s*(\d+)px/ms) || [])[1];
  console.log('  搜索框基准宽度        ', searchW + 'px');
  okS(Number(searchW) > 260, `搜索框应比原来的 260px 更长，实际 ${searchW}px`);

  /* 逐类各挑一个「只可能出现在该类里」的关键词。
     取值来自表格数据本身，不是我编的：
       AMC 图标名          fireman-drive（只在 AMC 列出现）
       KFPS 徽标文字        无设置（KFPS 的 no-setup 徽标文字）
       IoT 模式名          停泊模式（IoT 对 Parked 的叫法）
       MyDeviceView / 云视界 / 大屏 / LiveView 用各自独有的取值
       标准版 icon 名       toolbox、setting-off（库内 / 库外各一个）
                          原来用的是 backtop-M，FRE 那行换成 home 之后它已不在表内；
                          没改成 home 是因为要挑「只可能出现在该类里」的词，
                          toolbox 更不容易和别的字段撞。 */
  const CASES = [
    ['中文名', '驻停'],
    ['英文名', 'Parked'],
    ['AMC 图标名', 'fireman-drive'],
    ['KFPS 徽标文字', '无设置'],
    ['IoT 模式名', '停泊模式'],
    ['标准版 icon 名', 'toolbox'],
    ['标准版 icon 名（外部）', 'setting-off'],
  ];
  for (const [label, kw] of CASES) {
    const hits = search(kw);
    console.log(`  ${label.padEnd(22)} "${kw}" → ${hits.length} 行  ${hits.slice(0, 2).join(' / ')}`);
    okS(hits.length > 0, `搜「${kw}」应能命中（${label}）`);
  }

  /* MyDeviceView / 云视界 / 大屏 / LiveView 的名称：先从页面上取一个真实取值再搜，
     免得把关键词写死在测试里、数据一改测试就假失败。 */
  const pickLabel = (sel) => {
    input.value = '';
    input.dispatchEvent(new d3.window.Event('input', { bubbles: true }));
    const el = doc.querySelector(sel);
    return el ? el.textContent.trim() : '';
  };
  const PLATFORM_CASES = [
    ['MyDeviceView 名称', '.mdv-mode__label'],
    ['云视界 名称', '.yun-mode__label'],
    ['大屏 / LiveView 名称', '.overlay-mode__label'],
  ];
  for (const [label, sel] of PLATFORM_CASES) {
    const kw = pickLabel(sel);
    if (!kw) { searchFail.push(`页面上找不到 ${label} 的取值（选择器 ${sel}）`); continue; }
    const hits = search(kw);
    console.log(`  ${label.padEnd(22)} "${kw}" → ${hits.length} 行`);
    okS(hits.length > 0, `搜「${kw}」应能命中（${label}）`);
  }

  // 已移出范围的两项
  for (const [label, kw] of [['梯型', '扶梯'], ['高优先级', '高优先级']]) {
    const hits = search(kw);
    console.log(`  ${label.padEnd(22)} "${kw}" → ${hits.length} 行（应为 0，已按要求移出范围）`);
    okS(hits.length === 0, `「${label}」已移出搜索范围，搜「${kw}」不该有命中`);
  }

  // 注释内容不进搜索范围
  d3.window.localStorage.setItem('modes-icons.notes.v1', JSON.stringify({ Parked: '这是一条只存在本地的注释zzz' }));
  const noteHits = search('只存在本地的注释zzz');
  console.log(`  注释内容              → ${noteHits.length} 行（应为 0，本地草稿不参与搜索）`);
  okS(noteHits.length === 0, '注释内容不该被搜索命中');

  /* ---- 另外两个页签的搜索 ----
     搜索框三个页签共用，输入时由 renderActiveTab() 分派给当前页签那张表。
     这里逐个页签验证：能命中、能筛空、关键词跨页签保留，以及
     ——最容易出事的一项—— 实时数据表的 rowspan 在筛选后仍然自洽。 */
  const clickTab = (id) => doc.getElementById(id).click();
  const bodyRows = (id) => [...doc.querySelectorAll(`#${id} tr`)]
    .filter((tr) => !tr.classList.contains('empty-row'));
  const emptyCell = (id) => doc.querySelector(`#${id} tr.empty-row td`);
  /* 按 rowspan / colspan 把单元格铺进网格：每行必须恰好填满 cols 列、互不重叠。
     筛选后 rowspan 若还按全表算，跨度会超出实际渲染的行数，这里会立刻报出来。 */
  const gridOk = (id, cols, label) => {
    const trs = [...doc.querySelectorAll(`#${id} tr`)];
    const grid = trs.map(() => new Array(cols).fill(0));
    trs.forEach((tr, ri) => {
      let ci = 0;
      for (const cell of tr.children) {
        while (ci < cols && grid[ri][ci]) ci++;
        const rs = Number(cell.getAttribute('rowspan') || 1);
        const cs = Number(cell.getAttribute('colspan') || 1);
        for (let r = 0; r < rs; r++) {
          for (let c = 0; c < cs; c++) {
            if (ri + r >= trs.length || ci + c >= cols) { okS(false, `${label} 单元格越界（第 ${ri} 行）`); return; }
            if (grid[ri + r][ci + c]) { okS(false, `${label} 单元格重叠（第 ${ri} 行）`); return; }
            grid[ri + r][ci + c] = 1;
          }
        }
        ci += cs;
      }
    });
    const hole = grid.findIndex((row) => row.some((v) => !v));
    okS(hole === -1, `${label} 第 ${hole} 行没填满 ${cols} 列`);
  };

  clickTab('tab-function');
  input.value = '';
  input.dispatchEvent(new d3.window.Event('input', { bubbles: true }));
  const fnTotal = bodyRows('tbodyFunction').length;
  console.log(`  梯形页签 全量          ${fnTotal} 行 · 页签计数 ${doc.getElementById('tabCountFunction').textContent}`);
  okS(fnTotal > 0, '梯形 / 功能图标表应渲染出行');
  // 页签计数是「这一类共收多少条」，不跟搜索走
  okS(doc.getElementById('tabCountFunction').textContent === String(fnTotal), '梯形页签计数应等于全量行数');

  const fnSearch = (kw) => {
    input.value = kw;
    input.dispatchEvent(new d3.window.Event('input', { bubbles: true }));
    return bodyRows('tbodyFunction');
  };
  for (const [label, kw] of [['梯型', '扶梯'], ['中文名', '步道'], ['英文名', 'escalator']]) {
    const hits = fnSearch(kw);
    console.log(`  梯形页签 ${label.padEnd(12)} "${kw}" → ${hits.length} 行`);
    okS(hits.length > 0, `梯形页签搜「${kw}」应能命中（${label}）`);
  }
  // 命中的每一行都要真的含这个词（梯型列被合并隐藏的行靠中英文名命中）
  okS(fnSearch('escalator').every((tr) => tr.textContent.toLowerCase().includes('escalator')),
    '梯形页签的结果里出现了不含关键词的行');
  gridOk('tbodyFunction', 5, '梯形页签表格');
  for (const kw of ['svg', 'PNG']) {
    const hits = fnSearch(kw);
    const cell = emptyCell('tbodyFunction');
    console.log(`  梯形页签 下载按钮文字    "${kw}" → ${hits.length} 行 · 空状态 colspan=${cell?.getAttribute('colspan')}`);
    okS(hits.length === 0, `下载按钮文字「${kw}」不该进搜索范围`);
    okS(cell?.getAttribute('colspan') === '5', '梯形页签空状态 colspan 应为 5（该表 5 列）');
  }
  okS(fnSearch('').length === fnTotal, '清空关键词后梯形页签应恢复全量');

  clickTab('tab-live');
  const lvTotal = bodyRows('tbodyLive').length;
  console.log(`  实时页签 全量          ${lvTotal} 行 · 页签计数 ${doc.getElementById('tabCountLive').textContent}`);
  okS(lvTotal > 0, '其他实时数据图标表应渲染出行');
  okS(doc.getElementById('tabCountLive').textContent === String(lvTotal), '实时页签计数应等于全量行数');
  gridOk('tbodyLive', 9, '实时页签表格（未筛选）');

  const lvSearch = (kw) => {
    input.value = kw;
    input.dispatchEvent(new d3.window.Event('input', { bubbles: true }));
    return bodyRows('tbodyLive');
  };
  const LIVE_CASES = [
    ['实时数据名称', '梯门状态'],
    ['细分状态', '已关闭'],
    ['LiveView 字段名', 'door status'],   // 小写，验大小写无关
    /* 平台取值文字：实时载重那行云视界的卡片上写的是「60%」（细分是「不分状态」，
       所以格子里显示的只能是这个取值）。⚠️ 别拿「超载」来测 —— 两家的正常 / 已超载
       是同一张图、本表没拆行，那个词只活在 note / tooltip 里，表面看不见。 */
    ['平台取值文字', '60%'],
    ['标准版 icon 名', 'elevator-door-open'],
    ['梯型', '扶梯'],
  ];
  for (const [label, kw] of LIVE_CASES) {
    const hits = lvSearch(kw);
    console.log(`  实时页签 ${label.padEnd(12)} "${kw}" → ${hits.length} 行`);
    okS(hits.length > 0, `实时页签搜「${kw}」应能命中（${label}）`);
    gridOk('tbodyLive', 9, `实时页签表格（筛「${kw}」）`);
  }
  /* 命中单行时细分状态仍要显示 —— fieldRows 按全表数而不是按筛选结果数的那条规则，
     搞错的话搜到的词恰好会从表上消失。 */
  okS(lvSearch('已关闭')[0]?.textContent.includes('已关闭'), '命中单行时细分状态不该被留空');
  for (const kw of ['svg', 'png']) {
    const hits = lvSearch(kw);
    const cell = emptyCell('tbodyLive');
    console.log(`  实时页签 下载按钮文字    "${kw}" → ${hits.length} 行 · 空状态 colspan=${cell?.getAttribute('colspan')}`);
    okS(hits.length === 0, `下载按钮文字「${kw}」不该进搜索范围`);
    okS(cell?.getAttribute('colspan') === '9', '实时页签空状态 colspan 应为 9（该表 9 列）');
  }
  // 只活在 tooltip 里的东西不进范围：本表记号「不分状态」、Figma 节点号
  for (const [label, kw] of [['本表记号', '不分状态'], ['Figma 节点号', '1301:27383']]) {
    const hits = lvSearch(kw);
    console.log(`  实时页签 ${label.padEnd(12)} "${kw}" → ${hits.length} 行（应为 0，表面看不见）`);
    okS(hits.length === 0, `「${kw}」不该进搜索范围（${label}）`);
  }

  // 关键词跨页签保留，且切过去立刻按它重渲染
  lvSearch('扶梯');
  clickTab('tab-function');
  const keptFn = bodyRows('tbodyFunction').length;
  clickTab('tab-live');
  const keptLv = bodyRows('tbodyLive').length;
  console.log(`  跨页签保留关键词        「扶梯」→ 梯形 ${keptFn} 行 / 实时 ${keptLv} 行 · 输入框 ${JSON.stringify(input.value)}`);
  okS(input.value === '扶梯', '切页签不该清空关键词');
  okS(!input.disabled, '三个页签的搜索框都应可用');
  okS(keptFn > 0 && keptLv > 0, '切页签后应按当前关键词重渲染目标表');

  // 切回模式页签，原有搜索行为不受影响
  clickTab('tab-modes');
  const modesTotal = rows.length;   // 顶部那次渲染的行数（见文件开头的「渲染行数」）
  console.log(`  模式页签 回归           "驻停" → ${search('驻停').length} 行 · 清空 → ${search('').length} 行`);
  okS(search('驻停').length === 1, '模式页签搜索不应受影响');
  okS(search('').length === modesTotal, `清空后模式页签应恢复 ${modesTotal} 行`);

  okS(errs.length === 0, `搜索过程中不应报错：${errs.join('; ')}`);

  if (searchFail.length) {
    console.log('\n搜索范围校验未通过：');
    for (const f of searchFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('\n搜索范围校验通过');
  }

  d3.window.close();
}

/* ============================================================
   标准版图标的放大预览
   三张表的标准版图标（.lift-icon）悬停时浮出 160×160 的方形预览。
   卡住四件容易回退的事：
     1. 三个页签都能触发，且预览内容是**格子里那张图的克隆**（不是回查字典，
        也不是另渲染一份）
     2. 图标内部移动（svg → path）不闪，换图标能换内容，离开能收
     3. 锚点失效的场合都收掉：重渲染（搜索）、切页签、注释弹窗打开
     4. 只有标准版图标触发 —— 平台列那些图标（.iot-mode / .yun-mode / AMC 的 img）
        不在范围内
   以及两条 CSS 读数：浮层必须正方形、画框必须是 16 的整数倍
   （非整数倍放大会把 1 单位的笔画抹出半像素灰边，正是预览要解决的问题）。

   同样要新开 JSDOM：上面两段都把各自的窗口关掉了。
   ============================================================ */
console.log('\n标准版图标放大预览');

{
  const v4 = new VirtualConsole();
  const errs = [];
  v4.on('jsdomError', (e) => errs.push(e.message));
  const d4 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v4, pretendToBeVisual: true, url: 'http://localhost/',
  });
  const doc = d4.window.document;
  const pvFail = [];
  const okP = (cond, msg) => { if (!cond) pvFail.push(msg); };

  const over = (el, related) => el.dispatchEvent(
    new d4.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: related || null }));
  const out = (el, related) => el.dispatchEvent(
    new d4.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: related || null }));
  const preview = doc.getElementById('iconPreview');
  const stage = doc.getElementById('iconPreviewStage');
  const input = doc.getElementById('searchInput');
  const type = (v) => { input.value = v; input.dispatchEvent(new d4.window.Event('input', { bubbles: true })); };

  okP(!!preview && !!stage, '预览浮层节点应存在');
  okP(preview.hidden, '初始应隐藏');
  okP(preview.getAttribute('aria-hidden') === 'true', '纯视觉放大，应标 aria-hidden');

  for (const [label, tab, tbody] of [
    ['模式图标', 'tab-modes', 'tbody'],
    ['梯形 / 功能图标', 'tab-function', 'tbodyFunction'],
    ['其他实时数据图标', 'tab-live', 'tbodyLive'],
  ]) {
    doc.getElementById(tab).click();
    const icons = [...doc.querySelectorAll(`#${tbody} .lift-icon`)];
    okP(icons.length > 0, `${label} 应有标准版图标`);
    const el = icons[0];
    const src = el.querySelector('svg');
    over(el);
    const big = stage.querySelector('svg');
    console.log(`  ${label.padEnd(16)} ${icons.length} 个 · hover 后 ${preview.hidden ? '未显示' : '已显示'}`
      + ` · viewBox=${big?.getAttribute('viewBox')} path×${big?.querySelectorAll('path').length}`);
    okP(!preview.hidden, `${label}：hover 应显示预览`);
    okP(!!big, `${label}：预览里应有 svg`);
    okP(big?.getAttribute('viewBox') === src.getAttribute('viewBox'), `${label}：viewBox 应与格子里一致`);
    okP(big?.innerHTML === src.innerHTML, `${label}：预览应是格子里那张图的克隆`);
    // 带固定宽高的话 CSS 的 128px 画框会失效，预览被锁成 20px
    okP(!big?.hasAttribute('width') && !big?.hasAttribute('height'), `${label}：克隆后不该带固定宽高`);

    // svg → path 的内部移动不算离开（否则预览会在鼠标移动时反复闪）
    const inner = el.querySelector('path') || src;
    out(src, inner);
    okP(!preview.hidden, `${label}：图标内部移动不该收掉预览`);
    if (icons[1]) {
      over(icons[1]);
      okP(stage.querySelector('svg').innerHTML === icons[1].querySelector('svg').innerHTML,
        `${label}：换图标后预览内容应跟着换`);
      out(icons[1], doc.body);
    } else {
      out(el, doc.body);
    }
    okP(preview.hidden, `${label}：离开图标后应收掉`);
    okP(stage.innerHTML === '', `${label}：收掉后应清空内容`);
  }

  // 锚点会失效的三个场合
  doc.getElementById('tab-live').click();
  over(doc.querySelector('#tbodyLive .lift-icon'));
  type('梯门状态');
  console.log(`  搜索重渲染后          ${preview.hidden ? '已收起' : '仍在（错）'}`);
  okP(preview.hidden, '重渲染会换掉锚点节点，预览必须收起');
  type('');

  over(doc.querySelector('#tbodyLive .lift-icon'));
  doc.getElementById('tab-modes').click();
  console.log(`  切页签后              ${preview.hidden ? '已收起' : '仍在（错）'}`);
  okP(preview.hidden, '切页签后应收起预览');

  over(doc.querySelector('#tbody .lift-icon'));
  doc.querySelector('#tbody .note-btn').click();
  console.log(`  注释弹窗打开后        ${preview.hidden ? '已收起' : '仍在（错）'}`);
  okP(preview.hidden, '模态弹窗打开时不该有别的浮层在场（蒙层半透明，会透出来）');
  doc.getElementById('noteEditorCancel').click();

  // 平台列的图标不在范围内
  const other = doc.querySelector('#tbody .iot-mode__icon') || doc.querySelector('#tbody .amc-img');
  over(other);
  console.log(`  平台列图标 hover      ${preview.hidden ? '不出现（对）' : '出现了（错）'}`);
  okP(preview.hidden, '只有标准版图标（.lift-icon）才触发预览');

  // CSS 读数
  const block = (html.match(/\.icon-preview \{[^}]*\}/s) || [''])[0];
  const pick = (re) => (html.match(re) || [])[1];
  const pw = pick(/\.icon-preview \{[^}]*?width:\s*(\d+)px/s);
  const ph = pick(/\.icon-preview \{[^}]*?height:\s*(\d+)px/s);
  const sw = pick(/\.icon-preview__stage \{[^}]*?width:\s*(\d+)px/s);
  console.log(`  浮层 ${pw}×${ph} · 画框 ${sw}px（16 单位画框的 ${Number(sw) / 16} 倍）`);
  okP(pw === ph, `浮层必须是正方形，实际 ${pw}×${ph}`);
  okP(Number(sw) % 16 === 0, `画框必须是 16 的整数倍，实际 ${sw}px —— 非整数倍会把笔画抹糊`);
  okP(/pointer-events:\s*none/.test(block), '浮层必须 pointer-events: none，否则 hover 会抖');

  okP(errs.length === 0, `预览过程中不应报错：${errs.join('; ')}`);

  if (pvFail.length) {
    console.log('\n放大预览校验未通过：');
    for (const f of pvFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('\n放大预览校验通过');
  }

  d4.window.close();
}

/* ============================================================
   其他实时数据图标表的标准版筛选 + 手动争议标记
   与模式图标表的那一套同源（同一个 createStdFilterMenu 实例化出来的），
   但有三处刻意的不同，这一段就是来卡住这三处的：
     1. 只有「全部 / 新增/待确认」两档 —— 这张表 42 行全都填了标准版
     2. 纯手动：默认 0 个点亮，没有自动判定
     3. 粒度到「候选」：两候选的行（轿门传感器振动 横向 / 垂直）两格各有一个点
   另外验证两份标记互不串台（两个 localStorage key）、筛选与搜索是「与」关系、
   以及筛选后 rowspan 仍然自洽。
   ============================================================ */
console.log('\n实时数据表的标准版筛选与争议标记');

{
  const v5 = new VirtualConsole();
  const errs = [];
  v5.on('jsdomError', (e) => errs.push(e.message));
  const d5 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v5, pretendToBeVisual: true, url: 'http://localhost/',
  });
  const doc = d5.window.document;
  const lvFail = [];
  const okL = (cond, msg) => { if (!cond) lvFail.push(msg); };
  const click = (el) => el.dispatchEvent(new d5.window.MouseEvent('click', { bubbles: true }));
  const labelOf = (item) => [...item.querySelectorAll('span')]
    .map((s) => s.textContent.trim()).filter((t) => t && !/^\d+$/.test(t))[0];

  doc.getElementById('tab-live').click();
  const bodyRows = () => [...doc.querySelectorAll('#tbodyLive tr')]
    .filter((tr) => !tr.classList.contains('empty-row'));
  const dots = () => [...doc.querySelectorAll('#tbodyLive .dispute-dot')];
  const lit = () => dots().filter((d) => d.getAttribute('aria-pressed') === 'true');
  /* 筛选菜单开合都靠点按钮。读完就关，免得菜单留着影响后面的点空白关闭逻辑。 */
  const menuItems = () => {
    click(doc.getElementById('liveStdFilterBtn'));
    const items = [...doc.querySelectorAll('#liveStdFilterMenu .th-filter__item')].map((x) => ({
      key: x.getAttribute('data-key'),
      label: labelOf(x),
      count: Number(x.querySelector('.th-filter__count').textContent.trim()),
      on: x.getAttribute('aria-checked') === 'true',
    }));
    const reset = doc.querySelector('#liveStdFilterMenu .th-filter__reset');
    const resetText = reset ? reset.textContent.trim() : null;
    click(doc.getElementById('liveStdFilterBtn'));
    return { items, resetText };
  };
  const pickFilter = (key) => {
    click(doc.getElementById('liveStdFilterBtn'));
    const it = [...doc.querySelectorAll('#liveStdFilterMenu .th-filter__item')]
      .find((x) => x.getAttribute('data-key') === key);
    click(it);
  };
  /* 筛选后 rowspan 必须仍然自洽（算法同「放大预览」那段的 gridOk） */
  const gridOk = (label) => {
    const cols = 9;
    const trs = [...doc.querySelectorAll('#tbodyLive tr')];
    const grid = trs.map(() => new Array(cols).fill(0));
    trs.forEach((tr, ri) => {
      let ci = 0;
      for (const cell of tr.children) {
        while (ci < cols && grid[ri][ci]) ci++;
        const rs = Number(cell.getAttribute('rowspan') || 1);
        const cs = Number(cell.getAttribute('colspan') || 1);
        for (let r = 0; r < rs; r++) {
          for (let c = 0; c < cs; c++) {
            if (ri + r >= trs.length || ci + c >= cols) { okL(false, `${label} 单元格越界`); return; }
            if (grid[ri + r][ci + c]) { okL(false, `${label} 单元格重叠`); return; }
            grid[ri + r][ci + c] = 1;
          }
        }
        ci += cs;
      }
    });
    okL(grid.every((row) => row.every((v) => v)), `${label} 有没填满 ${cols} 列的行`);
  };

  const total = bodyRows().length;
  const m0 = menuItems();
  console.log('  筛选档位              ' + m0.items.map((i) => `${i.label} ${i.count}`).join(' / ')
    + ` · 当前 ${m0.items.find((i) => i.on)?.label}`);
  okL(m0.items.length === 2, `只该有「全部 / 新增/待确认」两档，实际 ${m0.items.length} 档`);
  okL(m0.items[0].key === 'all' && m0.items[1].key === 'disputed', '两档应是 all / disputed');
  okL(m0.items[0].count === total, `「全部」的计数应等于全量行数 ${total}`);
  okL(m0.items[1].count === 0, '纯手动标记，默认「新增/待确认」应为 0');
  okL(m0.items[0].on, '默认档位应是「全部」');
  okL(m0.resetText === null, '没有手动标记时不该出现清除入口');

  // 每格一个点：42 行里有 2 行是两候选 → 44 个格子 44 个点
  console.log(`  争议标记按钮          ${dots().length} 个（行数 ${total}，含两候选行各 2 格）`);
  okL(dots().length === 44, `按钮数应为 44（42 行 + 2 个两候选行各多一格），实际 ${dots().length}`);
  okL(lit().length === 0, '默认不该有点亮的点');
  okL(!doc.querySelector('#tbodyLive .dispute-dot--manual'), '默认不该有手动标注');

  /* 两候选的行：同一行里两个点、id 不同（行标识相同、候选图标键不同），
     互不联动 —— 要存疑的是某一个候选。 */
  const twoCellRow = bodyRows().find((tr) => tr.querySelectorAll('.dispute-dot').length === 2);
  okL(!!twoCellRow, '应能找到一行有两个争议标记（两个并存候选）');
  const pair = [...twoCellRow.querySelectorAll('.dispute-dot')]
    .map((d) => d.getAttribute('data-dispute-live'));
  console.log(`  两候选行的两个 id      ${pair.join('  |  ')}`);
  okL(pair[0] !== pair[1], '同一行两格的标识必须不同');
  okL(pair.every((id) => /#/.test(id)), '标识应是「行#候选图标键」的形式');
  click(twoCellRow.querySelectorAll('.dispute-dot')[0]);
  const pairLit = [...twoCellRow.querySelectorAll('.dispute-dot')]
    .map((d) => d.getAttribute('aria-pressed'));
  console.log(`  点亮左格后            左 ${pairLit[0]} / 右 ${pairLit[1]}（右格不该联动）`);
  okL(pairLit[0] === 'true' && pairLit[1] === 'false', '两个候选的标记必须各自独立');
  click(twoCellRow.querySelectorAll('.dispute-dot')[0]);   // 还原

  // 手动点亮：外观、tooltip、计数、落盘
  const d1 = dots()[1];
  const id1 = d1.getAttribute('data-dispute-live');
  click(d1);
  const after = dots().find((d) => d.getAttribute('data-dispute-live') === id1);
  console.log(`  手动点亮 ${id1}`);
  console.log(`    aria-pressed=${after.getAttribute('aria-pressed')}`
    + ` 手动=${after.classList.contains('dispute-dot--manual')}`
    + ` title=${JSON.stringify(after.title)}`);
  okL(after.getAttribute('aria-pressed') === 'true', '点一下应点亮');
  okL(after.classList.contains('dispute-dot--on'), '点亮态应带 --on');
  okL(after.classList.contains('dispute-dot--manual'), '这张表的点亮一律是手动标注');
  okL(/手动标注/.test(after.title), 'tooltip 应说明是手动标注');
  const store = () => JSON.parse(d5.window.localStorage.getItem('modes-icons.liveDisputeOverrides.v1') || '{}');
  console.log(`    落盘                ${JSON.stringify(store())}`);
  okL(store()[id1] === true, '应落到 liveDisputeOverrides 这个 key 上');
  /* 两份标记互不串台：模式图标表那份不能被这边写脏 */
  const modesStore = JSON.parse(d5.window.localStorage.getItem('modes-icons.disputeOverrides.v1') || 'null');
  console.log(`    模式表那份          ${JSON.stringify(modesStore)}（应为 null，没被碰过）`);
  okL(modesStore === null, '这张表的标记不该写进模式图标表的 key');

  const m1 = menuItems();
  console.log(`  点亮后菜单            ${m1.items.map((i) => `${i.label} ${i.count}`).join(' / ')}`
    + ` · ${m1.resetText}`);
  okL(m1.items[1].count === 1, '「新增/待确认」计数应变成 1');
  okL(/已手动标记 1 项/.test(m1.resetText || ''), '应出现清除入口并显示手动标记数');

  // 切到「新增/待确认」：只剩被标的那一行
  pickFilter('disputed');
  console.log(`  筛「新增/待确认」           ${bodyRows().length} 行 · 按钮 data-active=`
    + doc.getElementById('liveStdFilterBtn').getAttribute('data-active'));
  okL(bodyRows().length === 1, `筛「新增/待确认」应只剩 1 行，实际 ${bodyRows().length}`);
  okL(doc.getElementById('liveStdFilterBtn').getAttribute('data-active') === 'true',
    '非「全部」档位时筛选按钮应高亮');
  gridOk('筛「新增/待确认」后');

  // 筛选与搜索是「与」关系：两个条件都满足才留下
  const input = doc.getElementById('searchInput');
  const type = (v) => { input.value = v; input.dispatchEvent(new d5.window.Event('input', { bubbles: true })); };
  type('噪音');
  const emptyCell = doc.querySelector('#tbodyLive tr.empty-row td');
  console.log(`  叠加搜索「噪音」        ${bodyRows().length} 行 · 空状态「${emptyCell?.textContent.trim()}」`);
  okL(bodyRows().length === 0, '「噪音」不在新增/待确认里，叠加后应为空');
  okL(/关键词/.test(emptyCell?.textContent || '') && /标准版/.test(emptyCell?.textContent || ''),
    '空状态要同时说明是哪两个条件筛空的');
  okL(emptyCell?.getAttribute('colspan') === '9', '空状态 colspan 应为 9');
  type('');

  /* 在「新增/待确认」档位下熄灭 → 那一行要从结果里消失（整表重渲染那条分支） */
  click(dots()[0]);
  console.log(`  筛「新增/待确认」下熄灭      ${bodyRows().length} 行（应为 0）`);
  okL(bodyRows().length === 0, '熄灭后该行应从「新增/待确认」结果里消失');

  // 清除入口：回到干净状态
  pickFilter('all');
  click(dots()[1]);
  click(dots()[2]);
  console.log(`  再标两个后点亮          ${lit().length} 个`);
  okL(lit().length === 2, '应能标多个');
  click(doc.getElementById('liveStdFilterBtn'));
  click(doc.querySelector('#liveStdFilterMenu .th-filter__reset'));
  console.log(`  清除后点亮              ${lit().length} 个 · 落盘 ${JSON.stringify(store())}`);
  okL(lit().length === 0, '清除后不该有点亮的点');
  okL(Object.keys(store()).length === 0, '清除后落盘应为空');
  okL(!doc.querySelector('#tbodyLive .dispute-dot--manual'), '清除后不该残留手动标注');

  // 模式图标表那份不受影响：仍然是 13 个自动点亮（吊坠换成库内图标后从 14 减到 13）
  doc.getElementById('tab-modes').click();
  const modesLit = doc.querySelectorAll('#tbody .dispute-dot[aria-pressed="true"]').length;
  console.log(`  模式表默认点亮          ${modesLit} 个（自动判定，未受影响）`);
  okL(modesLit === 13, `模式图标表仍应有 13 个自动点亮，实际 ${modesLit}`);

  okL(errs.length === 0, `过程中不应报错：${errs.join('; ')}`);

  if (lvFail.length) {
    console.log('\n实时数据表筛选与争议标记校验未通过：');
    for (const f of lvFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('\n实时数据表筛选与争议标记校验通过');
  }

  d5.window.close();
}

/* ============================================================
   最终整理版本
   第四个页签：前三张表「标准版」图标按三大类汇总，图标库式网格。
   卡住的事：
     1. 分类与口径 —— 三类依次是 电梯模式 / 电梯类型、状态 / 实时数据。
        三类的方框数都等于对应页签标准版按「图标身份」类内去重后的数
        （电梯模式是「同图合并」：同一张图的几行合成一个方框，按第一行在表里的位置排）
        （有节点号按节点号，没有的按来源 + 名字），独立重算，不读页面里的
        FINAL_SECTIONS 自证；页签计数 = 三类之和（跨类不去重）
     2. 不能按名字去重：elevator-door-filded 两个同名节点都得在「电梯类型、状态」里
     3. 所有方框里的图标只用 currentColor —— 原来梯形表有 10 张写死了 #11161A /
        #414548，深色模式下整格看起来是空的，就是在这里扫出来的
     4. 类内排序：英文名字母序在前、中文名在后
     5. 搜索只按名字；没命中的类整块收起，命中的类计数写「命中 / 总数」；
        三类都没命中给一个空状态；切页签保留关键词
     6. 网格方框按要求不再悬停放大（三张表里的照旧）
     9. 左侧导航（没有小标题）：三类一长页往下排；滚动时导航跟着高亮当前类（scroll-spy），
        点导航滚到那一类；搜索时导航计数写命中数，0 命中的类右边收起、导航项禁用
     8. 电梯模式的同图合并：组名、英文取第一行 + ›、tooltip 列出全部场景、
        组内各行的名字都能搜到
     7. 电梯模式一类的三个名字 + 梯型标签：
        中文语义优先 IoT / 云视界、取第一个含汉字的；英文语义 KFPS 优先；
        icon 库原始名称 = 标准版图标名；梯型标签取表的梯型列，「直梯/扶梯」出两个，
        表里没标的不出
   ============================================================ */
console.log('\n最终整理版本');

{
  const v6 = new VirtualConsole();
  const errs = [];
  v6.on('jsdomError', (e) => errs.push(e.message));
  const d6 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v6, pretendToBeVisual: true, url: 'http://localhost/',
  });
  const doc = d6.window.document;
  const E = (s) => d6.window.eval(s);
  const fnFail = [];
  const okF = (cond, msg) => { if (!cond) fnFail.push(msg); };

  // 1. 独立重算三类各自的去重口径
  const idOf = (icon, name, node) => (node ? 'node:' + node : 'src:' + (icon.src || 'Design Token China') + '|' + name);
  const want = { modes: new Set(), lift: new Set(), live: new Set() };
  const modeOrder = [];            // 电梯模式：同图合并，顺序取每组第一行在表里的位置
  E('ROWS').forEach((r) => {
    if (!r.std) return;
    const id = idOf(r.std, r.std.name, r.std.node);
    if (!want.modes.has(id)) modeOrder.push(r.std.name);
    want.modes.add(id);
  });
  const modeIconIds = want.modes;
  /* 电梯类型、状态 一类按要求去掉了 11 个（FINAL_LIFT_EXCLUDE）。这份清单是人定的，
     这里照着它重算；清单本身另有断言卡住（见下面「排除清单」那几行）。 */
  const liftExclude = E('FINAL_LIFT_EXCLUDE');
  const liftRowsKept = E('LIFT_ICON_ROWS').filter((r) => liftExclude.indexOf(r.key) === -1);
  liftRowsKept.forEach((r) => { const i = E('LIFT_ICONS')[r.key]; if (i) want.lift.add(idOf(i, r.en, r.node)); });
  /* 实时数据按梯型分了 直梯 / 扶梯 两组，去重键是「梯型 + 图标身份」（同一张图两个梯型都用的，
     两组各放一个）；liveIconIds 只按图标身份，算「全页不同的图标」用 */
  const liveIconIds = new Set();
  /* 振动类（字段名带「振动」）统一改用 vibration-Horizonta、温度类（带「温度」）统一改用 thermometer
     （按要求合并）；无值态（标准版 bias）的行不受影响 */
  const mergeKeys = { 振动: 'vibrationHorizonta', 温度: 'thermometer' };
  const generalKeys = ['bias', ...Object.values(mergeKeys)];
  E('LIVE_ROWS').forEach((r) => {
    const std = (Array.isArray(r.std) ? r.std : [r.std]).filter(Boolean);
    const mk = Object.keys(mergeKeys).find((w) => r.f.includes(w));
    (mk && !std.includes('bias') ? [mergeKeys[mk]] : std).forEach((k) => {
      const i = E('LIVE_STD_ICONS')[k];
      if (!i) return;
      // bias（无数据 / 无数值）、振动、温度不分梯型，归入单开的「通用」组
      want.live.add((generalKeys.includes(k) ? '通用' : r.lift) + '|' + idOf(i, i.name, i.node));
      liveIconIds.add(idOf(i, i.name, i.node));
    });
  });
  const wantTotal = want.modes.size + want.lift.size + want.live.size;
  const allIds = new Set([...modeIconIds, ...want.lift, ...liveIconIds]);

  doc.getElementById('tab-final').click();
  const panel = doc.getElementById('panel-final');
  const sections = () => [...doc.querySelectorAll('#finalSections .final-section')];
  const secOf = (key) => doc.querySelector(`#finalSections .final-section[data-section="${key}"]`);
  const itemsOf = (sec) => (sec ? [...sec.querySelectorAll('.final-item')] : []);
  /* 方框对应的图标名。电梯模式一类目录页上已不显示 icon 库原始名称，从 li 的 data-icon 取；
     另外两类仍显示在方框下面。 */
  const iconOf = (li) => li.getAttribute('data-icon') || li.querySelector('.final-item__name').textContent;
  const namesOf = (sec) => itemsOf(sec).map(iconOf);
  const allItems = () => [...doc.querySelectorAll('#finalSections .final-item')];
  const countText = (sec) => sec.querySelector('.final-section__count').textContent;
  /* 三类一长页往下排，showCat 只是取那一类的 section（名字沿用，不再点导航切换） */
  const navBtns = () => [...doc.querySelectorAll('#finalNav .final-nav__item')];
  const navOf = (key) => navBtns().find((b) => b.dataset.cat === key);
  const navCount = (key) => navOf(key).querySelector('.final-nav__count').textContent;
  const currentNav = () => navBtns().filter((b) => b.getAttribute('aria-current') === 'true').map((b) => b.dataset.cat).join(',');
  const showCat = (key) => secOf(key);
  const CATS = [['modes', '电梯模式'], ['lift', '电梯类型、状态'], ['live', '实时数据']];
  const tick = () => new Promise((r) => setTimeout(r, 40));

  // 9. 左侧导航
  const titles = navBtns().map((b) => b.querySelector('span').textContent);
  console.log(`  面板 ${panel.hidden ? '隐藏' : '显示'} · 导航 ${titles.join(' / ')}`
    + ` · 右侧 ${sections().map((x) => x.dataset.section).join(',')} · 当前项 ${currentNav()}`);
  okF(!panel.hidden, '切到「最终整理版本」后面板应显示');
  okF(!!doc.querySelector('#panel-final nav.final-nav'), '左侧应有分类导航（<nav>）');
  okF(!doc.querySelector('.final-nav__title') && !/最终整理版本/.test(doc.querySelector('.final-nav').textContent),
    '导航上方的「最终整理版本」小标题应已删除');
  okF(JSON.stringify(titles) === JSON.stringify(['电梯模式', '电梯类型、状态', '实时数据']),
    `导航的三类名称与顺序不对：${titles.join(' / ')}`);
  okF(JSON.stringify(sections().map((x) => x.dataset.section)) === '["modes","lift","live"]', '三类应在同一页上依次往下排');
  // 「页面顶部时亮电梯模式」放在下面 scroll-spy 的第一个用例里验：
  // jsdom 没有排版，造位置之前三个 section 的 top 全是 0，最后一类会被判成当前类
  okF(navBtns().filter((b) => b.getAttribute('aria-current') === 'true').length === 1, '导航同一时刻只应有一项是当前项');

  /* 页面里有一段本机预览自动刷新（localhost 下每秒 fetch 一次 HEAD），下面要等 1s 多，
     它会被触发；jsdom 没有 fetch，换成一个永不返回的空实现。 */
  d6.window.fetch = () => new Promise(() => {});

  /* scroll-spy：jsdom 没有排版，手动给三个 section 和页签条造位置，再派发 scroll。
     判定线 = 页签条底边 + 16（这里页签条底边造成 121，线在 137）。 */
  const fakeRect = (el, top) => { el.getBoundingClientRect = () => ({ top, bottom: top + 500, left: 0, right: 0, width: 0, height: 500 }); };
  doc.querySelector('.tabs').getBoundingClientRect = () => ({ top: 56, bottom: 121, left: 0, right: 0, width: 0, height: 65 });
  const spyAt = async (tops) => {
    CATS.forEach(([k], i) => fakeRect(secOf(k), tops[i]));
    d6.window.dispatchEvent(new d6.window.Event('scroll'));
    await tick();
    return currentNav();
  };
  const spyCases = [
    ['页面顶部', [137, 1900, 2500], 'modes'],
    ['电梯类型的标题刚越过判定线', [-1700, 130, 600], 'lift'],
    ['实时数据的标题压在判定线上', [-2300, -600, 137], 'live'],
    ['滚回电梯模式中段', [-400, 1400, 2000], 'modes'],
  ];
  for (const [label, tops, wantKey] of spyCases) {
    const got = await spyAt(tops);
    console.log(`  scroll-spy ${label.padEnd(16)} → ${got}`);
    okF(got === wantKey, `scroll-spy：${label} 时导航应亮「${wantKey}」，实际 ${got}`);
  }

  // 点导航：滚到那一类（scrollIntoView），高亮立即换过去
  const scrolled = [];
  d6.window.Element.prototype.scrollIntoView = function (opt) { scrolled.push([this.dataset.section, opt && opt.behavior]); };
  navOf('live').dispatchEvent(new d6.window.MouseEvent('click', { bubbles: true }));
  console.log(`  点导航「实时数据」       scrollIntoView ${JSON.stringify(scrolled)} · 当前项 ${currentNav()}`);
  okF(scrolled.length === 1 && scrolled[0][0] === 'live' && scrolled[0][1] === 'smooth', '点导航应平滑滚到那一类');
  okF(currentNav() === 'live', '点导航后当前项应立即换成那一类（不等滚动结束）');
  // 滚动期间锁住高亮：判定线上还是电梯模式，也不该闪回去
  CATS.forEach(([k], i) => fakeRect(secOf(k), [137, 1900, 2500][i]));
  d6.window.dispatchEvent(new d6.window.Event('scroll'));
  await tick();
  okF(currentNav() === 'live', '平滑滚动期间高亮应锁在点的那一类，不随中间位置闪动');
  await new Promise((r) => setTimeout(r, 1100));   // 等锁释放（滚动停 150ms 或 1s 兜底）
  okF(currentNav() === 'modes', '滚动结束后应回到按位置判定');
  okF(/scroll-margin-top:\s*calc\(var\(--topnav-height\) \+ var\(--tabs-bar-height\) \+ 16px\)/.test(html),
    '类标题的 scroll-margin-top 应与判定线同一条（导航栏 + 页签条 + 16px）');

  for (const [key, label] of CATS) {
    const sec = showCat(key);
    const n = sec ? itemsOf(sec).length : 0;
    console.log(`  ${label.padEnd(10)} 方框 ${n} · 标题计数 ${sec ? countText(sec) : '-'} · 导航计数 ${navCount(key)} · 独立重算 ${want[key].size}`);
    okF(n === want[key].size, `「${label}」方框数应为 ${want[key].size}，实际 ${n}`);
    okF(sec && countText(sec) === String(want[key].size), `「${label}」标题计数应为 ${want[key].size}`);
    okF(navCount(key) === String(want[key].size), `「${label}」导航计数应为 ${want[key].size}`);
    okF(sec && sec.getAttribute('aria-labelledby') && doc.getElementById(sec.getAttribute('aria-labelledby')),
      `「${label}」应由标题标注（aria-labelledby）`);
  }
  const tabCount = doc.getElementById('tabCountFinal').textContent;
  console.log(`  页签计数 ${tabCount} = 三类之和 ${wantTotal}（全页不同的图标 ${allIds.size} 个）`);
  okF(tabCount === String(wantTotal), `页签计数应为三类之和 ${wantTotal}，实际 ${tabCount}`);

  // 跨类重复要在 tooltip 里看得见
  showCat('lift');
  const crossItem = allItems().find((li) => /也在：/.test(li.getAttribute('title')));
  okF(!!crossItem, '有跨类重复时，tooltip 里应写「也在：xxx」');

  // 2. 同名不同节点的两张都在
  const dupName = namesOf(showCat('lift')).filter((n) => n === 'elevator-door-filded').length;
  console.log(`  elevator-door-filded   ${dupName} 个（库里两个同名节点，图形不同）`);
  okF(dupName === 2, '不能按名字去重：elevator-door-filded 的两个节点都应保留');

  // 3. 只用 currentColor（三类逐个切过去看）
  const badFill = [];
  let noViewBox = 0;
  for (const [key] of CATS) {
    showCat(key);
    allItems().forEach((li) => {
      const svg = li.querySelector('svg');
      if (!svg?.getAttribute('viewBox')) noViewBox++;
      if ([...(svg?.innerHTML || '').matchAll(/(?:fill|stroke)="([^"]+)"/g)]
        .some((m) => m[1] !== 'currentColor' && m[1] !== 'none')) badFill.push(iconOf(li));
    });
  }
  console.log(`  写死色值的图标        ${badFill.length ? badFill.join(', ') : '0 个'}`);
  okF(badFill.length === 0, `这些图标写死了色值，深色模式下会看不见：${badFill.join(', ')}`);
  okF(noViewBox === 0, '每个方框都应有带 viewBox 的 svg');

  // 4. 类内排序。电梯模式按表的行序（与模式图标页签一致），另外两类按字母序
  const modeNamesShown = namesOf(showCat('modes'));
  /* 按要求成对排在一起的三组（FINAL_MODE_ORDER_GROUPS）：每组挪到组内最靠前那一格的位置。
     这里按图标名独立重算一遍期望顺序，不读页面里的那份清单 */
  const modePairs = [['zone-high', 'zone-low'], ['elevator-passenger', 'elevator-button'], ['setting', 'setting-off']];
  let modeWant = [...modeOrder];
  for (const pair of modePairs) {
    const at = Math.min(...pair.map((n) => modeWant.indexOf(n)));
    const before = modeWant.slice(0, at).filter((n) => !pair.includes(n)).length;
    const rest = modeWant.filter((n) => !pair.includes(n));
    modeWant = [...rest.slice(0, before), ...pair, ...rest.slice(before)];
  }
  const pairPos = modePairs.map((p) => p.map((n) => modeNamesShown.indexOf(n) + 1).join('+'));
  console.log(`  电梯模式成对排列      优先高区/低区 ${pairPos[0]} · 优先内呼/外呼 ${pairPos[1]} · 设置/未设置 ${pairPos[2]}`);
  okF(JSON.stringify(modeNamesShown) === JSON.stringify(modeWant),
    '电梯模式一类应按模式图标表的行序排列，优先高区/低区、优先内呼/外呼、设置/未设置 三对各自排在一起');
  okF(modePairs.every((p) => modeNamesShown.indexOf(p[1]) === modeNamesShown.indexOf(p[0]) + 1), '三对都应相邻，且按 高区→低区、内呼→外呼、设置→未设置 的先后');
  /* 字母序在「组」内判：实时数据整类是一组；电梯类型、状态 按梯型分了三个小组，
     逐个小组判（小组之间是按梯型排的，不是字母序） */
  const sortGroups = ['lift', 'live'].flatMap((k) =>
    [...showCat(k).querySelectorAll('.final-subsection')].map((g) => [k + '/' + g.dataset.lift, g]));
  // 按要求固定在组首的几格（运行方向 上 / 下 / 左 / 右）不参与字母序，单独核对（见「扶梯组顺序」）
  // 电梯类型、状态的扶梯组同样固定了两格：扶梯 1 → 扶梯
  // 直梯组线性段 10 格、面形段 8 格全部固定顺序（见「直梯组线性段 / 面形段顺序」）
  const pinnedZh = ['运行方向-上行', '运行方向-下行', '运行方向-左行', '运行方向-右行', '扶梯 1', '扶梯',
    '电梯', '梯门', '梯门已关', '梯门已开', '关门中', '开门中', '关门中 2', '开门中 2', '梯群', '梯群控制',
    '电梯（填充）', '梯门（填充，同名另一版）', '梯门（填充）2', '关门中（填充）1',
    '关门中（填充）2', '梯门（填充）', '开门中（填充）2', '电梯换乘（填充）'];
  const escLift = [...showCat('lift').querySelectorAll('.final-subsection')].find((g) => g.dataset.lift === '扶梯');
  const escLiftIcons = itemsOf(escLift).map(iconOf);
  console.log(`  电梯类型 扶梯组顺序    ${escLiftIcons.join(' / ')}`);
  okF(JSON.stringify(escLiftIcons.slice(0, 2)) === '["escalator1","escalator"]', '电梯类型、状态的扶梯组应是 扶梯 1（escalator1）在前、扶梯（escalator）在后');
  /* 电梯类型、状态：线性（描边）在前、面形（名字带 filled / filded）在后，字母序在两段内各自判 */
  const isSolid = (n) => /-fil(le|de)d/.test(n);
  const zhiIcons = itemsOf([...showCat('lift').querySelectorAll('.final-subsection')].find((g) => g.dataset.lift === '直梯')).map(iconOf);
  const firstSolid = zhiIcons.findIndex(isSolid);
  console.log(`  电梯类型 直梯组        线性 ${firstSolid} 个在前 · 面形 ${zhiIcons.length - firstSolid} 个在后（首个面形 ${zhiIcons[firstSolid]}）`);
  for (const g of showCat('lift').querySelectorAll('.final-subsection')) {
    const ic = itemsOf(g).map(iconOf);
    const fs = ic.findIndex(isSolid);
    okF(fs === -1 || ic.slice(fs).every(isSolid), `电梯类型、状态「${g.dataset.lift}」组应线性图标在前、面形在后`);
  }
  okF(firstSolid > 0 && zhiIcons.slice(0, firstSolid).every((n) => !isSolid(n)), '直梯组应先列线性图标');
  const zhiLis = itemsOf([...showCat('lift').querySelectorAll('.final-subsection')].find((g) => g.dataset.lift === '直梯'));
  const lineSeq = zhiLis.slice(0, firstSolid).map((li) => li.querySelector('.final-item__zh').textContent);
  console.log(`  直梯组线性段顺序      ${lineSeq.join(' / ')}`);
  okF(JSON.stringify(lineSeq) === JSON.stringify(['电梯', '梯门', '梯门已关', '梯门已开', '关门中', '开门中', '关门中 2', '开门中 2', '梯群', '梯群控制']),
    '直梯组线性段应按指定的 10 格顺序排列');
  const solidSeq = zhiLis.slice(firstSolid).map((li) => li.querySelector('.final-item__zh').textContent);
  console.log(`  直梯组面形段顺序      ${solidSeq.join(' / ')}`);
  okF(JSON.stringify(solidSeq) === JSON.stringify(['电梯（填充）', '梯门（填充，同名另一版）', '梯门（填充）2', '关门中（填充）1',
    '关门中（填充）2', '梯门（填充）', '开门中（填充）2', '电梯换乘（填充）']), '直梯组面形段应按指定的 8 格顺序排列');
  okF(zhiLis[firstSolid].getAttribute('data-icon') === 'elevator-filled'
    && zhiLis[firstSolid + 1].getAttribute('data-icon') === 'elevator-door-filded', '面形段前两格应是 elevator-filled、elevator-door-filded（无箭头那一版）');
  for (const [gname, g] of sortGroups) {
    const sec = { dataset: { section: gname } };
    const ns = itemsOf(g).filter((li) => !pinnedZh.includes(li.querySelector('.final-item__zh')?.textContent)).map(iconOf);
    const firstCjk = ns.findIndex((n) => !/^[\x00-\x7f]/.test(n));
    const latinPart = firstCjk === -1 ? ns : ns.slice(0, firstCjk);
    okF(latinPart.every((n, i) => i === 0
      || (gname.startsWith('lift/') && isSolid(n) !== isSolid(latinPart[i - 1]))
      || latinPart[i - 1].localeCompare(n, 'en', { sensitivity: 'base', numeric: true }) <= 0),
      `「${sec.dataset.section}」类内英文名应按字母序排列（电梯类型、状态在线性 / 面形两段内各自判）`);
    okF(firstCjk === -1 || ns.slice(firstCjk).every((n) => !/^[\x00-\x7f]/.test(n)),
      `「${sec.dataset.section}」类内中文名应全部排在英文名之后`);
  }
  // 电梯类型、状态 按梯型分三个小组：直梯 / 扶梯 / 步道梯，计数与梯形表一致
  const liftByType = {};
  liftRowsKept.forEach((r) => { liftByType[r.lift] = (liftByType[r.lift] || 0) + 1; });
  // 排除清单：11 个、每个 key 都真实存在（防止改名后清单静默失效），且确实没出现在页面上
  const allLiftKeys = E('LIFT_ICON_ROWS').map((r) => r.key);
  const liftShownNames = itemsOf(showCat('lift')).map(iconOf);
  const excludedNames = E('LIFT_ICON_ROWS').filter((r) => liftExclude.indexOf(r.key) !== -1).map((r) => r.en);
  console.log(`  排除清单              ${liftExclude.length} 个：${excludedNames.join(', ')}`);
  okF(liftExclude.length === 11, `排除清单应为 11 个，实际 ${liftExclude.length}`);
  okF(liftExclude.every((k) => allLiftKeys.indexOf(k) !== -1), `排除清单里有梯形表不存在的 key：${liftExclude.filter((k) => allLiftKeys.indexOf(k) === -1).join(', ')}`);
  okF(excludedNames.every((n) => liftShownNames.indexOf(n) === -1), '排除清单里的图标不该出现在「电梯类型、状态」里');
  okF(liftShownNames.indexOf('elevator-exchange-filled') !== -1 && liftShownNames.indexOf('elevator-exchange') === -1,
    'elevator-exchange 只去掉描边版，实心的 elevator-exchange-filled 应保留');
  // 梯形 / 功能图标 页签不受影响
  okF(doc.querySelectorAll('#tbodyFunction tr').length === allLiftKeys.length, '「梯形 / 功能图标」页签应照旧列出全部图标');
  // 「也在」按实际收了什么算：elevator-button 在电梯模式里，不该再写「也在：电梯类型、状态」
  const btnLi = itemsOf(showCat('modes')).find((li) => iconOf(li) === 'elevator-button');
  okF(btnLi && !/也在：电梯类型、状态/.test(btnLi.getAttribute('title')), '被排除的图标，电梯模式那边的 tooltip 不该再写「也在：电梯类型、状态」');
  const groups = [...showCat('lift').querySelectorAll('.final-subsection')];
  const groupInfo = groups.map((g) => `${g.dataset.lift} ${itemsOf(g).length}（标题 ${g.querySelector('.final-section__count').textContent}）`);
  console.log(`  电梯类型、状态 小组     ${groupInfo.join(' / ')} · 梯形表 ${JSON.stringify(liftByType)}`);
  okF(JSON.stringify(groups.map((g) => g.dataset.lift)) === '["直梯","扶梯","步道梯"]', '电梯类型、状态 应按 直梯 / 扶梯 / 步道梯 分三组');
  okF(groups.every((g) => g.querySelector('.final-subsection__title span').textContent === g.dataset.lift), '小组标题应为梯型名');
  okF(groups.every((g) => itemsOf(g).length === liftByType[g.dataset.lift]
    && g.querySelector('.final-section__count').textContent === String(liftByType[g.dataset.lift])), '各小组的方框数与标题计数应等于梯形表里该梯型的行数');
  okF(groups.reduce((n, g) => n + itemsOf(g).length, 0) === want.lift.size, '三个小组合起来应是这一类的全部方框');
  okF(itemsOf(groups.find((g) => g.dataset.lift === '步道梯')).map(iconOf).join() === 'walk', '步道梯组应只有 walk');
  okF(itemsOf(groups.find((g) => g.dataset.lift === '扶梯')).every((li) => /^escalator/.test(iconOf(li))), '扶梯组应全是 escalator*');
  /* 中文释义：每个方框图标名上面一行，取梯形表的「中文」列。按 节点号 对回表里那一行
     （elevator-door-filded 有两个同名节点，按名字对会对错） */
  const liftLis = itemsOf(showCat('lift'));
  const zhByNode = {};
  liftRowsKept.forEach((r) => { zhByNode[r.node] = r.zh; });
  const liftZh = liftLis.map((li) => li.querySelector('.final-item__zh')?.textContent || '');
  console.log(`  电梯类型、状态 中文释义   ${liftZh.slice(0, 6).join(' / ')} … 共 ${liftZh.filter(Boolean).length} / ${liftLis.length}`);
  okF(liftLis.every((li) => li.classList.contains('final-item--named') && li.querySelector('.final-item__zh')),
    '电梯类型、状态 的每个方框都应有中文释义');
  okF(E('FINAL_SECTIONS').find((x) => x.key === 'lift').items.every((it) => it.zh === zhByNode[it.node]),
    '中文释义应取梯形表里同一个节点那一行的「中文」列');
  okF(liftLis.every((li) => /中文释义：/.test(li.getAttribute('title'))), 'tooltip 里应写上中文释义');
  const liftZhCs = d6.window.getComputedStyle(liftLis[0].querySelector('.final-item__zh'));
  const liftNameCs = d6.window.getComputedStyle(liftLis[0].querySelector('.final-item__name'));
  okF(liftZhCs.fontSize === '12px' && liftZhCs.whiteSpace === 'nowrap', '中文释义的版式应与电梯模式的中文语义一致（12px、一行）');
  okF(liftNameCs.marginTop === '-4px', '图标名作为第二行，应与中文释义收紧（margin-top -4px，同电梯模式）');
  /* 实时数据：中文名 =「实时数据名称-实时数据细分」，细分在表里留空的行只写名称；
     一张图挂多行的写第一行、后面跟 ›，其余的进 tooltip */
  // 实时数据按梯型分两组：直梯 / 扶梯，计数与实时数据表一致（同一张图两个梯型都用的，两组各算一个）
  const liveGroups = [...showCat('live').querySelectorAll('.final-subsection')];
  const liveWantBy = {};
  [...want.live].forEach((k) => { const lift = k.split('|')[0]; liveWantBy[lift] = (liveWantBy[lift] || 0) + 1; });
  console.log(`  实时数据 小组          ${liveGroups.map((g) => `${g.dataset.lift} ${itemsOf(g).length}`).join(' / ')} · 应为 ${JSON.stringify(liveWantBy)}`);
  okF(JSON.stringify(liveGroups.map((g) => g.dataset.lift)) === '["通用","直梯","扶梯"]', '实时数据应分 通用 / 直梯 / 扶梯 三组（通用在最前）');
  const liveGroupTitles = liveGroups.map((g) => g.querySelector('.final-subsection__title > span').textContent);
  const liftGroupTitles = [...showCat('lift').querySelectorAll('.final-subsection__title > span:first-child')].map((s) => s.textContent);
  console.log(`  小组标题              实时数据 ${liveGroupTitles.join(' / ')} · 电梯类型、状态 ${liftGroupTitles.join(' / ')}`);
  okF(JSON.stringify(liveGroupTitles) === '["通用","直梯","扶梯/步道梯"]', '实时数据的扶梯组标题应写作「扶梯/步道梯」');
  okF(JSON.stringify(liftGroupTitles) === '["直梯","扶梯","步道梯"]', '电梯类型、状态的小组标题不受影响（直梯 / 扶梯 / 步道梯）');
  okF(liveGroups.every((g) => itemsOf(g).length === liveWantBy[g.dataset.lift]
    && g.querySelector('.final-section__count').textContent === String(liveWantBy[g.dataset.lift])), '实时数据各组的方框数与标题计数应与实时数据表一致');
  const inGroup = (lift) => itemsOf(liveGroups.find((g) => g.dataset.lift === lift));
  const zhText = (li) => (li.querySelector('.final-item__zh-text') || li.querySelector('.final-item__zh'))?.textContent;
  okF(['dashboard-1'].every((n) => inGroup('直梯').some((li) => iconOf(li) === n) && inGroup('扶梯').some((li) => iconOf(li) === n)),
    '直梯、扶梯都用到的图标（dashboard-1）应在两组里各出现一次');
  // 无数据 / 无数值：合成「通用」组里的一格，直梯、扶梯组里不再有 bias
  const generalLis = inGroup('通用');
  console.log(`  通用组                ${generalLis.map((li) => `${zhText(li)}${li.querySelector('.final-item__more') ? ' ›' : ''}（${iconOf(li)}）`).join(', ')}`);
  okF(JSON.stringify(generalLis.map(iconOf)) === '["bias","thermometer","vibration-Horizonta"]', '「通用」组应只有 bias / thermometer / vibration-Horizonta 三格');
  okF(['bias', 'thermometer', 'vibration-Horizonta'].every((n) => !inGroup('直梯').some((li) => iconOf(li) === n) && !inGroup('扶梯').some((li) => iconOf(li) === n)),
    'bias / thermometer / vibration-Horizonta 已并入「通用」，直梯 / 扶梯组里不该再有');
  // 温度类合并：轿门传感器温度（直梯）+ 左 / 右扶手温度（扶梯）→「通用」里一格 thermometer「温度」
  const tempLi = inGroup('通用').find((li) => iconOf(li) === 'thermometer');
  const tempScenes = (tempLi?.getAttribute('title').match(/用于 (\d+) 个场景：(.*)/) || []);
  console.log(`  温度类合并            通用 → ${tempLi ? zhText(tempLi) : '（没有）'}（${tempScenes[1]} 个：${tempScenes[2]}）`);
  okF(!!tempLi && zhText(tempLi) === '温度' && Number(tempScenes[1]) === 3, '温度类（轿门传感器 1 行 + 左 / 右扶手 2 行）应在「通用」里合成一格「温度」');
  okF(!itemsOf(showCat('live')).some((li) => ['左扶手带温度', '右扶手带温度'].includes(iconOf(li))),
    '扶手带温度那两张图不该再出现在最终整理版本里');
  const liveLis = itemsOf(showCat('live'));
  const liveCard = (icon, lift = '直梯') => inGroup(lift).find((li) => iconOf(li) === icon);
  // 振动类合并：不分梯型，「通用」里一格 vibration-Horizonta，名字「振动」，挂轿门 3 行 + 齿轮箱 1 行
  const vibLi = liveCard('vibration-Horizonta', '通用');
  const vibScenes = (vibLi?.getAttribute('title').match(/用于 (\d+) 个场景：(.*)/) || []);
  console.log(`  振动类合并            通用 → ${vibLi ? zhText(vibLi) : '（没有）'}（${vibScenes[1]} 个：${vibScenes[2]}）`);
  okF(!!vibLi && zhText(vibLi) === '振动' && Number(vibScenes[1]) === 4, '振动类（轿门传感器 3 行 + 齿轮箱 1 行）应在「通用」里合成一格「振动」');
  okF(['横向振动', '纵向振动', '垂直振动', 'vibration-vertical', '齿轮箱振动'].every((n) => !liveLis.some((li) => iconOf(li) === n)),
    '振动类原来的其他候选图（横向振动 / 纵向振动 / 垂直振动 / vibration-vertical / 齿轮箱振动）不该再出现在最终整理版本里');
  okF(doc.querySelectorAll('#tbodyLive .dl-group').length === 2, '「其他实时数据图标」页签的两候选行应照旧（只改最终整理版本）');
  const liveCases = [
    // [梯型, 图标, 方框上的中文名, 是否带 ›, 场景数]
    ['直梯', 'layers', '当前楼层', false, 1],                   // 不分状态 → 只写名称
    ['直梯', 'elevator-door-closed', '梯门状态-已关闭', false, 1],
    ['直梯', 'Water droplets', '轿门传感器湿度', false, 1],      // 整个字段只有一行 → 只写名称
    ['扶梯', 'arrow-left', '运行方向-左行', false, 1],
    ['通用', 'bias', '无数据', true, 5],                         // 直梯 2 行无数据 + 扶梯 3 行无数值，合成一格
    ['直梯', 'dashboard-1', '速度-低速模式', true, 3],
    ['扶梯', 'dashboard-1', '速度', false, 1],                   // 细分「有数值」不写
    ['扶梯', 'megaphone', '噪音', false, 1],
    ['扶梯', 'wind', '能耗', false, 1],
    ['直梯', 'elevator-door', '梯门状态-已锁门', true, 2],
  ];
  for (const [lift, icon, zh, more, n] of liveCases) {
    const li = liveCard(icon, lift);
    const hasMore = !!li?.querySelector('.final-item__more svg');
    const scenes = (li?.getAttribute('title').match(/用于 (\d+) 个场景/) || [])[1];
    console.log(`  实时数据 ${lift} ${icon.padEnd(20)} → ${zhText(li)}${hasMore ? ' ›' : ''}${scenes ? '（tooltip ' + scenes + ' 个场景）' : ''}`);
    okF(zhText(li) === zh, `实时数据 ${lift}「${icon}」的中文名应为 ${zh}，实际 ${zhText(li)}`);
    okF(hasMore === more, `实时数据 ${lift}「${icon}」${more ? '挂了多行，应带 ›' : '只有一行，不该带 ›'}`);
    if (more) okF(Number(scenes) === n, `实时数据 ${lift}「${icon}」的 tooltip 应列出 ${n} 个场景，实际 ${scenes}`);
  }
  okF(liveLis.every((li) => li.classList.contains('final-item--named') && li.querySelector('.final-item__zh')),
    '实时数据的每个方框都应有中文名');
  okF(liveLis.every((li) => !/不分状态/.test(li.querySelector('.final-item__zh').textContent)), '「不分状态」是本表记号，不该出现在中文名里');
  // tooltip 里「其他实时数据图标：扶梯 · 能耗 · 有数值」那一行是指回原表的位置，照原表细分列写，不算
  const nameLines = (li) => li.getAttribute('title').split('\n').filter((l) => !/^其他实时数据图标：/.test(l)).join('\n');
  okF(liveLis.every((li) => !/有数值/.test(li.querySelector('.final-item__zh').textContent + nameLines(li))),
    '最终整理版本的实时数据名称里不该再出现「-有数值」（方框、tooltip 的中文释义 / 场景都不写）');
  const moreLi = liveCard('bias', '通用');
  okF(!!moreLi.querySelector('.final-item__zh > .final-item__more') && !moreLi.querySelector('.final-item__zh-text .final-item__more'),
    '› 必须在文字元素外面，不参与省略号截断');
  // 运行方向按要求固定为 上 / 下 / 左 / 右，排在扶梯组最前
  const escZh = inGroup('扶梯').map(zhText);
  console.log(`  扶梯组顺序            ${escZh.slice(0, 5).join(' / ')} …`);
  okF(JSON.stringify(escZh.slice(0, 4)) === JSON.stringify(['运行方向-上行', '运行方向-下行', '运行方向-左行', '运行方向-右行']),
    '扶梯/步道梯组的运行方向应按 上行 / 下行 / 左行 / 右行 排在最前');
  const liveNames = namesOf(showCat('live'));
  console.log(`  实时数据排序          首 ${liveNames.slice(0, 3).join(' / ')} … 末 ${liveNames.slice(-3).join(' / ')}`);

  // tooltip：全名 + 来源 + 在对应页签里用在哪
  const t0 = itemsOf(showCat('lift'))[0].getAttribute('title');
  okF(/来源：/.test(t0) && /梯形 \/ 功能图标：/.test(t0), '电梯类型、状态一类的 tooltip 应包含来源与使用位置');

  // 7. 电梯模式一类的三个名字 + 梯型标签
  showCat('modes');
  const modeCard = (zh, en) => itemsOf(secOf('modes')).find((li) =>
    li.querySelector('.final-item__zh').textContent === zh
    && (en === undefined || li.querySelector('.final-item__en').textContent === en));
  const cardText = (li) => [li.querySelector('.final-item__zh').textContent,
    li.querySelector('.final-item__en').textContent, iconOf(li)];
  /* 梯型：方框上的直梯 / 扶梯标签按要求去掉了，梯型只留在 tooltip（与详情页名称清单）里，
     这里从 tooltip 的「梯型：」那一行读回来，原有的梯型断言照旧有效 */
  const tagsOf = (li) => {
    const m = (li.getAttribute('title') || '').match(/^梯型：(.*)$/m);
    return !m || m[1] === '-' ? [] : m[1].split('、');   // 梯型不确定的写作「-」
  };
  const modeCases = [
    // [说明, 中文, 英文, 图标名, 标签]
    ['司机 / 司机模式 取 IoT 的「司机模式」；英文取 KFPS', '司机模式', 'Attendant Service (ATS)', 'sales', ['直梯']],
    ['IoT 中文列是英文 FPO，退到 KFPS 的「独立」', '独立', 'FPO Simplex Service', 'elevator-2', ['直梯']],
    ['三家都没汉字（FRE），原样显示、不编中文名', 'FRE', 'Fast Recall (FRE)', 'Open the door', ['直梯']],
    ['直梯/扶梯 拆成两个标签', '正常', 'Normal Service', 'check-rectangle', ['直梯', '扶梯']],
    ['KFPS 独有的行表里没标梯型，不出标签', '无效', 'Invalid', 'question-rectangle', []],
    ['FRD 按要求改名「消防员专用运行」', '消防员专用运行', "Fireman's Drive (FRD)", 'Safety helmet', []],
    ['分配：2026-10 改用 clock，按要求改名「预约派梯」、补标直梯', '预约派梯', 'Reserve Dispatch', 'clock', ['直梯']],
    ['表里梯型留空、按要求补标（访客，2026-10 改用 user-avatar）', '访客', 'Penthouse Visitor Service', 'user-avatar', ['直梯']],
    ['自动模式改用原来分配那张 Auto（圆圈 A）', '自动模式', 'Automatic Elevator Service (AES)', 'Auto', ['扶梯']],   // 梯型照表（IoT 扶梯的 automatic mode 并进这一行）
    ['RES E 原来是空槽，2026-10 填 alarm', 'RES E', 'RES E', 'alarm', ['直梯']],
    ['没有英文（Device Shadow 缺）的行显示「-」', '井道自学习', '-', 'shaft-learning', ['直梯']],
    ['表里梯型留空、按要求补标（FINAL_MODE_LIFT_FILL）', '吊坠', 'Pendant', 'user-maintenance', ['直梯']],
  ];
  for (const [label, zh, en, name, tags] of modeCases) {
    const li = modeCard(zh, en);
    const got = li ? cardText(li).join(' | ') + ' · 标签 ' + (tagsOf(li).join('+') || '无') : '（没找到）';
    console.log(`  ${label}\n    → ${got}`);
    okF(!!li, `电梯模式里应有「${zh} / ${en}」这一格（${label}）`);
    if (!li) continue;
    okF(cardText(li)[2] === name, `「${zh}」的 icon 库原始名称应为 ${name}，实际 ${cardText(li)[2]}`);
    okF(JSON.stringify(tagsOf(li)) === JSON.stringify(tags), `「${zh}」的梯型标签应为 ${tags.join('+') || '无'}，实际 ${tagsOf(li).join('+') || '无'}`);
  }
  // 8. 同图合并
  const byIcon = (name) => itemsOf(secOf('modes')).filter((li) => cardText(li)[2] === name);
  const enText = (li) => li.querySelector('.final-item__en-text').textContent;
  const hasMore = (li) => !!li.querySelector('.final-item__more svg');
  const groupCases = [
    // [图标名, 组名, 英文（第一行的）, 场景数, 标签]
    ['fire', '消防模式', 'Fire Detection (FID)', 6, ['直梯']],
    ['maintenance', '检修模式', 'RDF', 4, ['直梯', '扶梯']],        // 检修模式 ×2 胜出；标签取并集
    ['warning-triangle', '故障状态', 'ETSL Fail', 3, ['直梯']],      // 规则会选 ETSL故障，靠覆盖表改成总称
    ['logout', '疏散', 'MODE_EVACUATION for C_51701325', 2, ['直梯']],// 含汉字优先，不选 Evacuation for KCEGC
    ['minus-circle', '退出服务', 'Out of Service (car)', 5, ['直梯']],
    ['elevator-cargo', '货运', 'Freight Service', 2, []],             // 并列取靠前的
  ];
  for (const [icon, zh, en, n, tags] of groupCases) {
    const lis = byIcon(icon);
    const li = lis[0];
    const sr = li?.querySelector('.sr-only')?.textContent;
    const scenes = (li?.getAttribute('title').match(/^· /gm) || []).length;
    console.log(`  合并 ${icon.padEnd(17)} ${lis.length} 格 → ${li ? cardText(li)[0] + ' | ' + enText(li) + (hasMore(li) ? ' ›' : '') : '-'}`
      + ` · 标签 ${li ? tagsOf(li).join('+') || '无' : '-'} · tooltip 场景 ${scenes} · 读屏「${sr}」`);
    okF(lis.length === 1, `「${icon}」应只出现一次（同图合并），实际 ${lis.length} 次`);
    if (!li) continue;
    okF(cardText(li)[0] === zh, `「${icon}」组名应为 ${zh}，实际 ${cardText(li)[0]}`);
    okF(enText(li) === en, `「${icon}」英文语义应取第一行的 ${en}，实际 ${enText(li)}`);
    okF(hasMore(li), `「${icon}」是合并的方框，英文后面应有 ›`);
    okF(scenes === n, `「${icon}」的 tooltip 应列出 ${n} 个场景，实际 ${scenes}`);
    okF(sr === `等 ${n} 个场景`, `「${icon}」的 › 应带读屏文字「等 ${n} 个场景」`);
    okF(JSON.stringify(tagsOf(li)) === JSON.stringify(tags), `「${icon}」的梯型标签应为组内并集 ${tags.join('+') || '无'}`);
  }
  // 没合并的方框不该有 ›
  const singles = itemsOf(secOf('modes')).filter((li) => !hasMore(li));
  const merged = itemsOf(secOf('modes')).filter(hasMore);
  console.log(`  合并的 ${merged.length} 格 / 单独的 ${singles.length} 格`);
  okF(merged.length === 11, `应有 11 个合并的方框，实际 ${merged.length}`);
  okF(singles.every((li) => !/个场景：/.test(li.getAttribute('title'))), '单独的方框不该写「N 个场景」');
  // › 与文字分开，文字截断不会吃掉它
  okF(merged.every((li) => li.querySelector('.final-item__en > .final-item__more')
    && !li.querySelector('.final-item__en-text .final-item__more')), '› 必须在文字元素外面，不参与截断');
  // 目录页不再显示 icon 库原始名称（按要求删掉的第三行），tooltip 里仍有
  const modeLis = itemsOf(secOf('modes'));
  console.log(`  方框下的名字行          ${modeLis[0].querySelectorAll('.final-item__zh, .final-item__en, .final-item__name').length} 行（中文 / 英文语义）`);
  okF(modeLis.every((li) => !li.querySelector('.final-item__name')), '电梯模式的方框下不该再显示 icon 库原始名称');
  okF(modeLis.every((li) => /icon 库原始名称：/.test(li.getAttribute('title'))), 'icon 库原始名称应仍在 tooltip 里');
  // 每一格的标签都只能是「直梯」「扶梯」；图标是 48px（16 的整数倍）
  okF(!doc.querySelector('#finalSections .final-tag, #finalSections .final-item__tags'),
    '方框上不该再有直梯 / 扶梯标签（按要求去掉了）');
  okF(itemsOf(secOf('modes')).every((li) => tagsOf(li).every((t) => t === '直梯' || t === '扶梯')),
    '梯型标签只能是「直梯」或「扶梯」');
  /* 方框尺寸三类统一：只在 .final-layout 上定义一次（--final-box / --final-icon），
     方框与图标都引用它，不许哪一类再单独写死一个尺寸 */
  const layoutRule = (html.match(/\.final-layout \{[^}]*\}/s) || [''])[0];
  const boxPx = Number((layoutRule.match(/--final-box:\s*(\d+)px/) || [])[1]);
  const iconPx = Number((layoutRule.match(/--final-icon:\s*(\d+)px/) || [])[1]);
  const colsN = Number((layoutRule.match(/--final-cols:\s*(\d+)/) || [])[1]);
  const boxRule = (html.match(/\n\.final-item__box \{[^}]*\}/s) || [''])[0];
  const iconRule = (html.match(/\n\.final-item__icon \{[^}]*\}/s) || [''])[0];
  console.log(`  方框统一尺寸          ${boxPx}×${boxPx} · 图标 ${iconPx}px（${iconPx / 16} 倍）· 主体 ${colsN} 列 = ${colsN * boxPx + (colsN - 1) * 16}px`);
  okF(boxPx < 96, `统一方框按要求从 96 再缩小一档，实际 ${boxPx}`);
  okF(iconPx / boxPx <= 0.5, `图标占方框的比例不该超过一半，实际 ${iconPx} / ${boxPx}`);
  // 选择器可能是列表（电梯类型、状态 的 --named 共用这一套），按「选择器里含它」匹配
  const zhRules = [...html.matchAll(/\.final-item--detail \.final-item__zh[^{]*\{[^}]*\}/gs)].map((m) => m[0]);
  const zhRule = zhRules.find((r) => /font-size/.test(r)) || '';
  const zhPx = Number((zhRule.match(/font-size:\s*(\d+)px/) || [])[1]);
  console.log(`  电梯模式中文语义字号    ${zhPx}px`);
  okF(zhPx === 12, `电梯模式的中文语义按要求降到 Foot 12，实际 ${zhPx}px`);
  // 中英文都固定一行、放不下就省略号（排版是否真的一行只能在浏览器里量，这里卡住规则本身）
  const zhAll = zhRules.join('');
  const enTextRule = (html.match(/\.final-item--detail \.final-item__en-text \{[^}]*\}/s) || [''])[0];
  okF(/white-space:\s*nowrap/.test(zhAll) && /text-overflow:\s*ellipsis/.test(zhAll) && !/line-clamp/.test(zhAll),
    '中文语义应固定一行（nowrap + ellipsis），不再折两行');
  okF(/white-space:\s*nowrap/.test(enTextRule) && /text-overflow:\s*ellipsis/.test(enTextRule), '英文语义应固定一行（nowrap + ellipsis）');
  /* 再从「规则真的生效了没有」这一侧卡一次：jsdom 会按样式表算层叠。
     只看源码里写没写 nowrap 不够 —— 踩过一次，注释里照抄了 PRL 那一行的原名，
     里面的「星号 + 斜杠」把 CSS 注释提前关掉，紧跟的这条规则整条失效，源码看着没问题。 */
  const zhEl = itemsOf(showCat('modes'))[0].querySelector('.final-item__zh');
  const zhCs = d6.window.getComputedStyle(zhEl);
  console.log(`  中文语义实际样式        white-space=${zhCs.whiteSpace} · text-overflow=${zhCs.textOverflow} · font-size=${zhCs.fontSize}`);
  okF(zhCs.whiteSpace === 'nowrap' && zhCs.textOverflow === 'ellipsis', '中文语义的 nowrap / ellipsis 应真的生效（可能有 CSS 注释被提前关掉）');
  okF(zhCs.fontSize === '12px', '中文语义的 12px 字号应真的生效');
  okF(/width:\s*var\(--final-box\)/.test(boxRule) && /height:\s*var\(--final-box\)/.test(boxRule), '方框宽高都应引用 --final-box（正方形）');
  okF(/width:\s*var\(--final-icon\)/.test(iconRule), '方框里的图标应引用 --final-icon');
  okF(!/\.final-item--detail \.final-item__(box|icon) \{[^}]*(width|height):/s.test(html), '电梯模式不该再单独给方框或图标写尺寸');
  okF(iconPx % 16 === 0, `方框里的图标必须是 16 的整数倍，实际 ${iconPx}px —— 非整数倍会把笔画抹糊`);
  okF(/grid-template-columns:\s*repeat\(auto-fill, var\(--final-box\)\)/.test(html), '网格列宽应引用 --final-box');

  // 5. 搜索
  const input = doc.getElementById('searchInput');
  const type = (v) => { input.value = v; input.dispatchEvent(new d6.window.Event('input', { bubbles: true })); };
  // 电梯模式一类：中文 / 英文 / 图标名都能搜到，梯型标签不进范围；合并方框里各行的名字也能搜到
  type('FID M');
  const fidHit = secOf('modes') ? itemsOf(secOf('modes')).map((li) => cardText(li)[0]) : [];
  console.log(`  搜「FID M」（合并在消防里的一行）→ ${fidHit.join(' / ') || '无'}`);
  okF(fidHit.length === 1 && fidHit[0] === '消防模式', '搜合并方框里某一行的英文名，应命中那个合并的方框');
  // icon 库原始名称已从目录页去掉，按「只搜看得见的字」口径也移出了这一类的搜索范围
  type('open the door');
  console.log(`  电梯模式 搜 icon 库原始名称「open the door」 ${secOf('modes') ? '仍命中（错）' : '不命中（对）'}`);
  okF(!secOf('modes'), '目录页上看不见的 icon 库原始名称不该再命中电梯模式一类');
  for (const [kw, label] of [['停泊模式', '中文语义'], ['parked', '英文语义'], ['机房检修', '合并方框里某一行的中文名']]) {
    type(kw);
    okF(!!secOf('modes') && itemsOf(secOf('modes')).length > 0, `电梯模式一类搜「${kw}」应能命中（${label}）`);
  }
  type('扶梯');
  console.log(`  电梯模式 搜「扶梯」     ${secOf('modes') ? itemsOf(secOf('modes')).length + ' 个（错）' : '整类收起（对，梯型标签不进范围）'}`);
  okF(!secOf('modes'), '梯型标签不该进电梯模式一类的搜索范围');
  // 搜 LAYERS：只有实时数据有，另外两类收起、导航项禁用
  type('LAYERS');
  const navCounts = CATS.map(([k]) => `${k} ${navCount(k)}${navOf(k).disabled ? '(禁用)' : ''}`);
  console.log(`  搜「LAYERS」          右侧 ${sections().map((x) => x.dataset.section).join(',')} · 导航 ${navCounts.join(' / ')} · 当前项 ${currentNav()}`);
  okF(JSON.stringify(sections().map((x) => x.dataset.section)) === '["live"]', '没有命中的类应整块收起');
  okF(navCount('modes') === '0' && navCount('live') === '1', '搜索时导航计数应写各类的命中数');
  okF(navOf('modes').disabled && navOf('lift').disabled && !navOf('live').disabled, '命中 0 的类导航项应禁用（右边没有可滚到的地方）');
  okF(!!navOf('modes').querySelector('.final-nav__count--zero'), '命中 0 的类导航计数应调淡');
  okF(currentNav() === 'live', '只剩一类时导航当前项应是那一类');
  const liveSec = showCat('live');
  console.log(`  实时数据              ${itemsOf(liveSec).map(iconOf).join(', ')} · 标题计数 ${countText(liveSec)}`);
  okF(itemsOf(liveSec).length > 0 && itemsOf(liveSec).every((li) => iconOf(li).toLowerCase().includes('layers')),
    '搜索应不分大小写、只留含关键词的');
  okF(/^\d+ \/ \d+$/.test(countText(liveSec)), '搜索时类标题计数应写「命中 / 总数」');
  okF(doc.getElementById('tabCountFinal').textContent === String(wantTotal), '页签计数不跟着搜索走');
  // 实时数据：挂在同一张图上的其余场景名也能搜到
  type('能耗-无数值');
  console.log(`  搜「能耗-无数值」         实时数据 → ${itemsOf(secOf('live')).map(iconOf).join(', ') || '无'}`);
  okF(itemsOf(secOf('live')).map(iconOf).join() === 'bias', '搜挂在同一张图上的其他场景名，应命中那一格');
  // 电梯类型、状态 的中文释义进搜索范围
  type('梯门已开');
  console.log(`  搜「梯门已开」          电梯类型、状态 → ${itemsOf(secOf('lift')).map(iconOf).join(', ') || '无'}`);
  okF(itemsOf(secOf('lift')).map(iconOf).join() === 'elevator-door-open', '搜中文释义应能命中电梯类型、状态里对应的方框');
  // 电梯类型、状态 的小组：没命中的小组收起，小标题计数写「命中 / 总数」
  type('escalator');
  const liftGroupsNow = [...(secOf('lift')?.querySelectorAll('.final-subsection') || [])]
    .map((g) => `${g.dataset.lift} ${g.querySelector('.final-section__count').textContent}`);
  console.log(`  搜「escalator」        电梯类型、状态 剩下的小组 ${liftGroupsNow.join(' / ')}`);
  okF(JSON.stringify(liftGroupsNow) === '["扶梯 4 / 4"]', '搜索时没命中的梯型小组应收起，小标题计数写「命中 / 总数」');
  type('svg');
  const empty = doc.querySelector('#finalSections .final-empty');
  console.log(`  搜「svg」             空状态「${empty?.textContent}」`);
  okF(sections().length === 0 && !!empty, '三类都没命中时应给空状态');
  okF(navBtns().every((b) => b.disabled), '三类都没命中时导航三项都应禁用');
  type('Design Token China');
  okF(allItems().length === 0, '来源只在 tooltip 里，不该进搜索范围');
  type('layers');
  doc.getElementById('tab-live').click();
  doc.getElementById('tab-final').click();
  console.log(`  跨页签保留关键词      「${input.value}」→ ${allItems().length} 个`);
  okF(input.value === 'layers' && allItems().length > 0, '切页签应保留关键词并按它重渲染');
  type('');
  okF(CATS.every(([k]) => navCount(k) === String(want[k].size) && !navOf(k).disabled), '清空关键词后导航计数应恢复成各类总数、全部可点');
  okF(sections().length === 3 && allItems().length === wantTotal, '清空关键词应恢复三类全量');

  // 6. 网格方框按要求不再悬停放大（三张表里的标准版图标照旧放大，见「放大预览」一段）
  const preview = doc.getElementById('iconPreview');
  for (const k of ['lift', 'modes']) {
    const box = itemsOf(showCat(k))[3].querySelector('.final-item__box');
    box.dispatchEvent(new d6.window.MouseEvent('mouseover', { bubbles: true }));
    console.log(`  悬停「${k}」方框         预览 ${preview.hidden ? '不出现（对）' : '出现了（错）'}`);
    okF(preview.hidden, `「最终整理版本」网格里的方框不该再触发悬停放大（${k}）`);
  }
  okF(!/\.final-item__box \{[^}]*cursor:\s*zoom-in/s.test(html), '不再放大，网格方框不该再用 zoom-in 光标');

  // 图标显示尺寸必须是 16 的整数倍（理由同放大预览）

  okF(errs.length === 0, `过程中不应报错：${errs.join('; ')}`);

  if (fnFail.length) {
    console.log('\n最终整理版本校验未通过：');
    for (const f of fnFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('\n最终整理版本校验通过');
  }

  d6.window.close();
}

/* ============================================================
   图标详情页
   在「最终整理版本 · 电梯模式」里点方框进入的全屏对话框。卡住的事：
     1. 点电梯模式的方框能进、另外两类的方框不是按钮（暂不支持）
     2. 右栏内容：标题 = 组名、副标题 = 英文语义、名称清单（含 icon 库原始名称）、
        常见名称卡片列出模式图标表「英文」列里这个图标对应的全部名字
        （KFPS + IoT 两列、按表的顺序去重：消防 7 个 / 司机模式 2 个）
     3. 地址：打开时 hash 变成 #icon/<图标身份>；翻页用 replaceState 不加历史；
        关闭走 history.back 回到列表、焦点还给方框；
        直接带着 hash 打开页面会直接进详情，关闭时抹掉 hash
     4. 翻页范围跟当前搜索走；首尾禁用；← → Esc 键盘可用
     5. 预览尺寸：选 16px 就是 16px（16 的整数倍档位）
     6. 下载：只有一个按钮，点开菜单选 SVG / PNG；SVG 导出的文件名是库里的图标名，
        内容是独立 SVG；菜单开着时 Esc 只收菜单
     7. 右栏按要求删掉的三处（「最终整理版本 · 电梯模式」小字 / SVG 16×16 那行 / 来源）
        不再出现；「常见叫法」不带来源括号；梯型是纯文本、场景里不出梯型标签
     8. 场景释义：61 个方框每个都有摘要（FINAL_MODE_NOTES），没有多余的键
   hashchange / history.back 在 jsdom 里是异步派发的，所以这一段用 await 等一拍。
   ============================================================ */
console.log('\n图标详情页');

{
  const tick = () => new Promise((r) => setTimeout(r, 30));
  const v7 = new VirtualConsole();
  const errs = [];
  v7.on('jsdomError', (e) => errs.push(e.message));
  const d7 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v7, pretendToBeVisual: true, url: 'http://localhost/',
  });
  const w = d7.window;
  const doc = w.document;
  const dtFail = [];
  const okT = (cond, msg) => { if (!cond) dtFail.push(msg); };
  const $ = (id) => doc.getElementById(id);
  const click = (el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const key = (k, target) => (target || $('iconDetail')).dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  const dialog = $('iconDetail');
  const boxOf = (iconName) => [...doc.querySelectorAll('#finalSections [data-section="modes"] .final-item')]
    .find((li) => li.getAttribute('data-icon') === iconName)
    ?.querySelector('button.final-item__box');
  const scenes = () => [...doc.querySelectorAll('#iconDetailScenes .icon-detail__scene')];
  const names = () => Object.fromEntries([...doc.querySelectorAll('#iconDetailNames dt')]
    .map((dt) => [dt.textContent, dt.nextElementSibling.textContent]));

  // 页面在 localhost 下每秒 fetch 一次做自动刷新，jsdom 没有 fetch（理由同「最终整理版本」一段）
  w.fetch = () => new Promise(() => {});
  click($('tab-final'));
  okT(dialog.hidden, '初始应关闭');

  // 1. 三类的方框都是按钮（都有详情页）
  const modeBtns = doc.querySelectorAll('[data-section="modes"] button.final-item__box[data-final-id]').length;
  const liveBtns = doc.querySelectorAll('[data-section="live"] button.final-item__box[data-final-id]').length;
  const liveTotal = doc.querySelectorAll('[data-section="live"] .final-item').length;
  const liftBtns = doc.querySelectorAll('[data-section="lift"] button.final-item__box').length;
  const liftTotal = doc.querySelectorAll('[data-section="lift"] .final-item').length;
  console.log(`  可点的方框            电梯模式 ${modeBtns} 个 · 实时数据 ${liveBtns} / ${liveTotal} 个 · 电梯类型、状态 ${liftBtns} / ${liftTotal} 个`);
  okT(modeBtns === E7count(), '电梯模式的每个方框都应可点');
  okT(liveBtns === liveTotal && liveTotal > 0, '实时数据的每个方框都应可点（进详情页）');
  okT(liftBtns === liftTotal && liftTotal > 0, '电梯类型、状态的每个方框都应可点（进详情页）');
  okT(!doc.querySelector('#finalSections span.final-item__box'), '三类的方框都应是按钮，不该再有 span 方框');
  const liveIds = [...doc.querySelectorAll('[data-section="live"] button.final-item__box')].map((b) => b.dataset.finalId);
  okT(new Set(liveIds).size === liveIds.length, '实时数据每格的详情页身份应各不相同（直梯 / 扶梯两组共用的图也要分开）');
  function E7count() { return doc.querySelectorAll('[data-section="modes"] .final-item').length; }

  // 2. 打开消防模式
  const histBefore = w.history.length;
  const fireBox = boxOf('fire');
  fireBox.focus();
  click(fireBox);
  await tick();
  const fireHash = w.location.hash;
  console.log(`  点「消防模式」         ${dialog.hidden ? '没打开' : '已打开'} · hash ${decodeURIComponent(fireHash)}`
    + ` · 焦点 ${doc.activeElement?.id}`);
  okT(!dialog.hidden, '点电梯模式的方框应打开详情页');
  okT(/^#icon\//.test(fireHash), '打开后地址应是 #icon/<图标身份>');
  okT(doc.activeElement === $('iconDetailBack'), '打开后焦点应在返回按钮上');
  okT(doc.documentElement.style.overflow === 'hidden', '打开后背后的列表页不该跟着滚');
  console.log(`    标题 ${$('iconDetailTitle').textContent} · 位置 ${$('iconDetailPos').textContent}`);
  okT($('iconDetailTitle').textContent === '消防模式', '标题应为组名「消防模式」');
  // 按要求删掉的两句：标题下的英文副标题、应用场景卡片标题下的说明
  okT(!$('iconDetailSubtitle') && !$('iconDetailSceneDesc'), '标题下的英文副标题与应用场景下的说明句应已删除');
  const nm = names();
  console.log(`    名称清单 ${Object.entries(nm).map(([k, v]) => k + '=' + v).join(' / ')}`);
  okT(nm['中文语义'] === '消防模式' && nm['英文语义'] === 'Fire Detection (FID)' && nm['icon 库原始名称'] === 'fire',
    '名称清单应包含中文语义 / 英文语义 / icon 库原始名称');
  okT(nm['梯型'] === '直梯', '名称清单的梯型应为「直梯」');
  // 7. 删掉的三处
  okT(!('来源' in nm), '名称清单里不该再有「来源」一行');
  okT(!$('iconDetailMeta') && !$('iconDetailEyebrow'), '「SVG 16×16」那行与「最终整理版本 · 电梯模式」小字应已删除');
  okT(!$('iconDetailNames').querySelector('.final-tag'), '名称清单里的梯型应是纯文本，不是标签');
  okT(!$('iconDetailScenes').querySelector('.final-tag'), '常见名称里不该出梯型标签');
  // 常见名称：模式图标表「英文」列里消防 6 行的全部名字，按表的顺序去重
  const enList = () => scenes().map((li) => li.querySelector('.icon-detail__scene-name').textContent);
  const fireWant = ['Fire Detection (FID)', "Fireman's drive/fireFighter", 'FID M', 'FID B', 'FID S', 'FID V', 'FID Fireinput at LDG'];
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  okT($('iconDetailSceneTitle').textContent === '常见名称 · 7 个', `消防模式的卡片标题应为「常见名称 · 7 个」，实际 ${$('iconDetailSceneTitle').textContent}`);
  okT(JSON.stringify(enList()) === JSON.stringify(fireWant), `消防模式应按表的顺序列出 7 个英文名，实际 ${enList().join(' / ')}`);
  okT(!doc.querySelector('#iconDetailScenes .icon-detail__scene-zh, #iconDetailScenes .icon-detail__scene-alt'),
    '常见名称只列英文名，不再按场景写中文与「常见叫法」');
  okT(!$('iconDetailSceneShared'), '原「常见叫法」那一行应已删除');
  okT(!!$('iconDetailCanvas').querySelector('svg') && $('iconDetailCanvas').querySelector('svg').innerHTML === fireBox.querySelector('svg').innerHTML,
    '预览区画的应是方框里那张图');

  // 5. 预览尺寸
  $('iconDetailZoom').value = '16';
  $('iconDetailZoom').dispatchEvent(new w.Event('change', { bubbles: true }));
  console.log(`  预览尺寸选 16px        画布 ${$('iconDetailCanvas').style.width} × ${$('iconDetailCanvas').style.height}`);
  okT($('iconDetailCanvas').style.width === '16px' && $('iconDetailCanvas').style.height === '16px', '选 16px 档画布应为 16×16');
  okT([...$('iconDetailZoom').options].every((o) => o.value === 'auto' || Number(o.value) % 16 === 0),
    '预览尺寸的档位必须都是 16 的整数倍');
  $('iconDetailZoom').value = 'auto';
  $('iconDetailZoom').dispatchEvent(new w.Event('change', { bubbles: true }));
  okT(Number.parseInt($('iconDetailCanvas').style.width, 10) % 16 === 0, '自适应档也必须取 16 的整数倍');

  // 4. 翻页：replaceState，不加历史
  const histOpen = w.history.length;
  click($('iconDetailNext'));
  await tick();
  const afterNext = $('iconDetailTitle').textContent;
  console.log(`  下一个                → ${afterNext} · 位置 ${$('iconDetailPos').textContent} · 历史 ${histOpen} → ${w.history.length}`);
  okT(afterNext !== '消防模式', '点下一个应换图标');
  okT(w.history.length === histOpen, '翻页不该新增历史记录（后退应直接回列表）');
  okT(w.location.hash !== fireHash, '翻页后地址应跟着换');
  key('ArrowLeft');
  okT($('iconDetailTitle').textContent === '消防模式', '← 应回到上一个');
  key('ArrowRight');
  const lastSeen = $('iconDetailTitle').textContent;

  // 8. 场景释义（此时已翻到下一个图标，按当前显示的那个核对）
  const notesMap = w.eval('FINAL_MODE_NOTES');
  const noteParas = [...doc.querySelectorAll('#iconDetailNote p')].map((p) => p.textContent);
  const curIcon = names()['icon 库原始名称'];
  console.log(`    场景释义（${curIcon}）${noteParas.length} 段：${noteParas.join(' / ').slice(0, 60)}…`);
  okT(JSON.stringify(noteParas) === JSON.stringify(notesMap[curIcon]), '场景释义卡片应逐段显示 FINAL_MODE_NOTES 里这个图标的摘要');
  okT(/火警/.test((notesMap.fire || []).join('')), '消防模式的场景释义应说明火警联动');
  // 「待内部确认」这类话术按要求不出现在详情页的场景释义里（电梯模式 / 电梯类型、状态 两份）
  const pendingWords = /待(内部|设计)?确认|需(设计|评审)?确认|待定/;
  const allNotes = [...Object.values(notesMap), ...Object.values(w.eval('FINAL_LIFT_NOTES'))].flat();
  okT(!allNotes.some((t) => pendingWords.test(t)), `场景释义里不该有「待内部确认」这类话术：${allNotes.filter((t) => pendingWords.test(t)).join(' / ')}`);
  okT($('iconDetailNoteTitle').textContent === '场景释义', '第三张卡片的标题应为「场景释义」');
  okT(doc.querySelectorAll('.icon-detail__cards > .icon-detail__names, .icon-detail__cards > .icon-detail__card').length === 3,
    '三张卡片应在同一个 .icon-detail__cards 容器里（卡片间距由它单独控制）');
  const modeIcons = [...doc.querySelectorAll('[data-section="modes"] .final-item')].map((x) => x.getAttribute('data-icon'));
  const missing = modeIcons.filter((n) => !(notesMap[n] && notesMap[n].length));
  const extra = Object.keys(notesMap).filter((k) => modeIcons.indexOf(k) === -1);
  const longest = Math.max(...Object.values(notesMap).flat().map((t) => t.length));
  console.log(`  场景释义覆盖           ${modeIcons.length - missing.length} / ${modeIcons.length} · 多余 ${extra.length} · 最长一句 ${longest} 字`);
  okT(missing.length === 0, `这些方框没有场景释义：${missing.join(', ')}`);
  okT(extra.length === 0, `FINAL_MODE_NOTES 里有不对应任何方框的键（多半是图标改名后没同步）：${extra.join(', ')}`);
  okT(longest <= 80, `场景释义要是精简摘要，最长一句不该超过 80 字，实际 ${longest}`);
  okT(Object.values(notesMap).every((a) => a.length <= 2), '场景释义每条最多两句');

  // 6. 下载：一个按钮 + 格式菜单
  const dlBtn = $('iconDetailDl');
  const dlMenu = $('iconDetailDlMenu');
  okT(!!dlBtn && !$('iconDetailSvg') && !$('iconDetailPng'), '下载应只有一个按钮');
  okT(dlBtn.textContent.trim() === '下载' && !!dlBtn.querySelector('.icon-detail__dl-arrow svg'), '下载按钮应是「下载」+ 箭头');
  okT(dlMenu.hidden && dlBtn.getAttribute('aria-expanded') === 'false', '菜单初始应收起');
  click(dlBtn);
  const formats = [...dlMenu.querySelectorAll('.icon-detail__dl-item')].map((b) => b.getAttribute('data-format'));
  console.log(`  点「下载」             菜单 ${dlMenu.hidden ? '没开' : '已开'} · 选项 ${formats.join(' / ')} · 焦点在第一项 ${doc.activeElement === dlMenu.querySelector('.icon-detail__dl-item')}`);
  okT(!dlMenu.hidden && dlBtn.getAttribute('aria-expanded') === 'true', '点下载应展开格式菜单');
  okT(JSON.stringify(formats) === '["svg","png"]', '菜单应提供 SVG / PNG 两项');
  okT(doc.activeElement === dlMenu.querySelector('.icon-detail__dl-item'), '展开后焦点应在第一项');
  key('Escape', doc.activeElement);
  okT(dlMenu.hidden && !dialog.hidden, '菜单开着时 Esc 只收菜单，不关详情页');
  okT(doc.activeElement === dlBtn, '收起菜单后焦点应还给下载按钮');

  // 下载 SVG
  const saved = [];
  w.Blob = function (parts, opts) { this.parts = parts; this.type = opts && opts.type; saved.push(this); };
  w.URL.createObjectURL = () => 'blob:stub';
  w.URL.revokeObjectURL = () => {};
  const dlNames = [];
  w.HTMLAnchorElement.prototype.click = function () { dlNames.push(this.download); };
  click(dlBtn);
  click(dlMenu.querySelector('[data-format="svg"]'));
  const svgText = saved.length ? String(saved[0].parts.join('')) : '';
  console.log(`  菜单选 SVG            ${JSON.stringify(dlNames[0])} · ${svgText.slice(0, 40)}… · 菜单 ${dlMenu.hidden ? '已收起' : '仍开着'}`);
  okT(/\.svg$/.test(dlNames[0] || '') && /^<svg xmlns=/.test(svgText), '选 SVG 应导出以图标名命名的独立 SVG 文件');
  okT(dlMenu.hidden, '选完格式菜单应收起');

  // 3. Esc 关闭 → history.back → 回列表，焦点还给最后看的那个方框
  key('Escape');
  await tick();
  const focusedName = doc.activeElement?.closest?.('.final-item')?.querySelector('.final-item__zh')?.textContent;
  console.log(`  Esc 关闭              ${dialog.hidden ? '已关闭' : '仍开着'} · hash「${w.location.hash}」 · 焦点回到「${focusedName}」 · 历史 ${w.history.length}`);
  okT(dialog.hidden, 'Esc 应关闭详情页');
  okT(w.location.hash === '', '关闭后地址里的 #icon/... 应退掉');
  okT(focusedName === lastSeen, `焦点应还给最后看的那个方框（${lastSeen}），实际 ${focusedName}`);
  okT(doc.documentElement.style.overflow === '', '关闭后应恢复列表页滚动');
  okT(w.history.length === histBefore + 1, '整个过程只应 push 过一次历史（打开那一下）');

  // 单个场景的方框
  click(boxOf('sales'));
  await tick();
  console.log(`  点「司机模式」         ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  okT($('iconDetailSceneTitle').textContent === '常见名称 · 2 个', '司机模式的卡片标题应为「常见名称 · 2 个」');
  okT(JSON.stringify(enList()) === JSON.stringify(['Attendant Service (ATS)', 'Attendant service']),
    '司机模式应列出 KFPS 与 IoT 两个英文名');
  click($('iconDetailBack'));
  await tick();
  okT(dialog.hidden, '返回按钮应关闭详情页');
  // 原始资料里没有英文名的行：标题不写个数，给一个「-」占位；名称清单的英文语义也是「-」
  click(boxOf('shaft-learning'));
  await tick();
  console.log(`  点「井道自学习」       ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  okT($('iconDetailSceneTitle').textContent === '常见名称' && enList().join('') === '-',
    '没有英文名的行应显示「常见名称」+「-」');
  okT(names()['英文语义'] === '-', `缺英文名的，名称清单的英文语义应为「-」，实际 ${names()['英文语义']}`);
  // 常见名称 / 常用于表达 只有一项（或只有「-」）时整张卡片不显示；多于一项的照常显示
  const sceneCard = $('iconDetailSceneCard');
  okT(sceneCard.hidden, '只有一项（这里是「-」）的常见名称卡片应隐藏');
  key('Escape');
  await tick();
  click(boxOf('fire'));
  await tick();
  okT(!sceneCard.hidden && scenes().length === 7, '消防模式有 7 个常见名称，卡片应显示');
  key('Escape');
  await tick();
  click(boxOf('user-avatar'));
  await tick();
  console.log(`  点「访客」             常见名称 ${scenes().length} 项 · 卡片${sceneCard.hidden ? '隐藏' : '显示'}`);
  okT(sceneCard.hidden, '访客只有 1 个常见名称，卡片应隐藏');
  const hiddenCount = w.eval('FINAL_SECTIONS').flatMap((sec) => sec.items).filter((it) => {
    w.eval('renderIconDetail')(it);
    return sceneCard.hidden;
  }).length;
  console.log(`  卡片隐藏的方框        ${hiddenCount} 个（三类合计）`);
  okT(w.eval('FINAL_SECTIONS').flatMap((sec) => sec.items).every((it) => {
    w.eval('renderIconDetail')(it);
    return sceneCard.hidden === (scenes().length <= 1);
  }), '每一格：卡片隐藏当且仅当只有一项');
  okT(!/原始资料缺/.test(doc.body.innerHTML), '「原始资料缺」的写法应已全部换成「-」');
  click($('iconDetailBack'));
  await tick();

  // ---- 实时数据的详情页 ----
  const liveBox = (lift, icon) => [...doc.querySelectorAll(`[data-section="live"] .final-subsection[data-lift="${lift}"] .final-item`)]
    .find((li) => li.dataset.icon === icon)?.querySelector('button.final-item__box');
  click(liveBox('直梯', 'dashboard-1'));
  await tick();
  const lvNames = names();
  console.log(`  点实时数据「速度」      ${dialog.hidden ? '没打开' : '已打开'} · 标题 ${$('iconDetailTitle').textContent} · 位置 ${$('iconDetailPos').textContent}`
    + ` · hash ${decodeURIComponent(w.location.hash)}`);
  console.log(`    名称清单 ${Object.entries(lvNames).map(([k, v]) => k + '=' + v).join(' / ')}`);
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  console.log(`    场景释义：${[...doc.querySelectorAll('#iconDetailNote p')].map((x) => x.textContent).join(' / ')}`);
  okT(!dialog.hidden && /^#icon\/live/.test(decodeURIComponent(w.location.hash)), '点实时数据的方框应打开详情页，地址带 live 前缀');
  okT(lvNames['中文名称'] === '速度-低速模式' && lvNames['icon 库原始名称'] === 'dashboard-1' && lvNames['梯型'] === '直梯',
    '实时数据详情页的名称清单应写中文名称 / icon 库原始名称 / 梯型');
  okT(!('英文语义' in lvNames), '实时数据没有英文语义，名称清单不该出这一行');
  okT($('iconDetailSceneTitle').textContent === '常用于表达 · 3 个' && enList()[0] === '速度-低速模式',
    '实时数据详情页的卡片标题应为「常用于表达」，并列出这一格代表的各项');
  okT(/统一使用这个图标/.test($('iconDetailNote').textContent), '实时数据的场景释义应说明这个图标代表哪几项');
  okT(/扶梯实时数据「速度」也使用这个图标，列在「扶梯\/步道梯」分组里/.test($('iconDetailNote').textContent),
    '直梯、扶梯都用的图标，场景释义应指明另一个梯型分组里也有');
  // 翻页只在实时数据里翻：翻到头也不会翻进电梯模式
  const lvTotal = Number($('iconDetailPos').textContent.split(' / ')[1]);
  okT(lvTotal === liveTotal, `实时数据详情页的翻页范围应是实时数据这一类（${liveTotal} 个），实际 ${lvTotal}`);
  key('Escape');
  await tick();
  okT(dialog.hidden && doc.activeElement === liveBox('直梯', 'dashboard-1'), '关掉后焦点应还给点进来的那个实时数据方框');
  // 运行方向 左行 / 右行是步道梯的方向：网格仍在「扶梯/步道梯」组，详情页梯型标「步道梯」
  for (const [icon, zh] of [['arrow-left', '运行方向-左行'], ['arrow-right', '运行方向-右行']]) {
    click(liveBox('扶梯', icon));
    await tick();
    const n = names();
    const note = $('iconDetailNote').textContent;
    console.log(`  点「${zh}」       梯型 ${n['梯型']} · 场景释义 ${note.slice(0, 30)}…`);
    okT(n['中文名称'] === zh && n['梯型'] === '步道梯', `「${zh}」详情页的梯型应标为「步道梯」，实际 ${n['梯型']}`);
    okT(/^步道梯实时数据「运行方向」/.test(note), `「${zh}」的场景释义应写步道梯`);
    key('Escape');
    await tick();
  }
  click(liveBox('扶梯', 'arrow-up-right'));
  await tick();
  okT(names()['梯型'] === '扶梯', '同组其他运行方向（上行 / 下行）的梯型仍是「扶梯」');
  key('Escape');
  await tick();
  // 通用组的「振动」：轿门传感器振动 3 行（直梯）+ 齿轮箱振动 1 行（扶梯），不分梯型
  click(liveBox('通用', 'vibration-Horizonta'));
  await tick();
  const vNames = names();
  const vNote = [...doc.querySelectorAll('#iconDetailNote p')].map((x) => x.textContent);
  console.log(`  点通用组的「振动」      ${$('iconDetailTitle').textContent} · 名称清单 ${Object.entries(vNames).map(([k, v]) => k + '=' + v).join(' / ')}`);
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  console.log(`    场景释义：${vNote.join(' / ')}`);
  okT($('iconDetailTitle').textContent === '振动' && vNames['icon 库原始名称'] === 'vibration-Horizonta', '通用组振动那一格的标题应为「振动」');
  okT(!('梯型' in vNames) && !('适用梯型' in vNames), '通用组的详情页不该有梯型这一行');
  okT($('iconDetailSceneTitle').textContent === '常用于表达 · 4 个' && enList().some((n) => /^齿轮箱振动（扶梯）$/.test(n))
    && enList().filter((n) => /^轿门传感器振动-.+（直梯）$/.test(n)).length === 3, '振动应列出轿门传感器 3 项（直梯）与齿轮箱振动（扶梯）');
  okT(/不分直梯、扶梯/.test(vNote.join('')), '振动的场景释义应说明不分梯型统一用这张图');
  key('Escape');
  await tick();
  // 通用组的「温度」：轿门传感器温度（直梯）+ 左 / 右扶手温度（扶梯）
  click(liveBox('通用', 'thermometer'));
  await tick();
  const tNames = names();
  const tNote = [...doc.querySelectorAll('#iconDetailNote p')].map((x) => x.textContent);
  console.log(`  点通用组的「温度」      ${$('iconDetailTitle').textContent} · 名称清单 ${Object.entries(tNames).map(([k, v]) => k + '=' + v).join(' / ')}`);
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  console.log(`    场景释义：${tNote.join(' / ')}`);
  okT($('iconDetailTitle').textContent === '温度' && tNames['icon 库原始名称'] === 'thermometer' && !('梯型' in tNames),
    '通用组温度那一格：标题「温度」、图标 thermometer、不列梯型');
  okT(JSON.stringify(enList()) === JSON.stringify(['轿门传感器温度（直梯）', '左扶手温度（扶梯）', '右扶手温度（扶梯）']),
    '温度应列出轿门传感器温度（直梯）与左 / 右扶手温度（扶梯）');
  okT(/温度类实时数据/.test(tNote.join('')) && /不分直梯、扶梯/.test(tNote.join('')), '温度的场景释义应说明不分梯型统一用这张图');
  key('Escape');
  await tick();
  // 通用组的「无数据」：合并了直梯、扶梯的 5 行，详情页逐项列出并说明用法
  click(liveBox('通用', 'bias'));
  await tick();
  const biasHash = w.location.hash;
  const gNames = names();
  const gNote = [...doc.querySelectorAll('#iconDetailNote p')].map((x) => x.textContent);
  console.log(`  点通用组的「无数据」    ${$('iconDetailTitle').textContent} · 名称清单 ${Object.entries(gNames).map(([k, v]) => k + '=' + v).join(' / ')}`);
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  console.log(`    场景释义 ${gNote.length} 段：${gNote[0]}`);
  okT($('iconDetailTitle').textContent === '无数据', '通用组那一格的标题应为「无数据」');
  okT(gNames['icon 库原始名称'] === 'bias' && !('梯型' in gNames) && !('适用梯型' in gNames), '通用组「无数据」的名称清单不该有梯型这一行');
  okT($('iconDetailSceneTitle').textContent === '常用于表达 · 5 个' && enList().filter((n) => /（直梯）$/.test(n)).length === 2
    && enList().filter((n) => /（扶梯）$/.test(n)).length === 3, '常见名称应列出 5 项、每项带上梯型（直梯 2 / 扶梯 3）');
  // 第三段（各平台叫法的来历）按要求删掉了，只留两段
  okT(gNote.length === 2 && /没有可显示的值/.test(gNote[0]) && !/各平台叫法/.test(gNote.join('')),
    '无数据的场景释义应只有两段：什么时候用、与字段无关');
  key('Escape');
  await tick();
  // 带着实时数据的链接直接打开页面
  const d9 = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' + biasHash });
  const d9open = !d9.window.document.getElementById('iconDetail').hidden;
  const d9title = d9.window.document.getElementById('iconDetailTitle').textContent;
  console.log(`  带实时数据的 hash 直接打开  ${d9open ? '直接进详情' : '没进'}（${d9title}）`);
  okT(d9open && d9title === '无数据', '带着实时数据的 #icon/live... 打开页面应直接进那一格的详情');
  d9.window.close();

  // 梯型不确定的电梯模式（如 清洗）：名称清单的梯型只写「-」
  click(boxOf('brush-clear'));
  await tick();
  console.log(`  点「${$('iconDetailTitle').textContent}」           梯型 ${names()['梯型']}`);
  okT(names()['梯型'] === '-', `梯型不确定的应显示「-」，实际 ${names()['梯型']}`);
  okT(!/表里未标注/.test(doc.body.innerHTML), '「表里未标注」的写法应已全部换成「-」');
  key('Escape');
  await tick();

  // ---- 电梯类型、状态的详情页 ----
  const liftBox = (icon) => [...doc.querySelectorAll('[data-section="lift"] .final-item')]
    .find((li) => li.dataset.icon === icon)?.querySelector('button.final-item__box');
  click(liftBox('elevator-door-open'));
  await tick();
  const lfNames = names();
  const lfNote = [...doc.querySelectorAll('#iconDetailNote p')].map((x) => x.textContent);
  console.log(`  点「梯门已开」         ${dialog.hidden ? '没打开' : '已打开'} · 标题 ${$('iconDetailTitle').textContent} · 位置 ${$('iconDetailPos').textContent}`
    + ` · hash ${decodeURIComponent(w.location.hash)}`);
  console.log(`    名称清单 ${Object.entries(lfNames).map(([k, v]) => k + '=' + v).join(' / ')}`);
  console.log(`    ${$('iconDetailSceneTitle').textContent}：${enList().join(' / ')}`);
  console.log(`    场景释义：${lfNote.join(' / ')}`);
  okT(!dialog.hidden && /^#icon\/lift/.test(decodeURIComponent(w.location.hash)), '点电梯类型、状态的方框应打开详情页，地址带 lift 前缀');
  okT($('iconDetailTitle').textContent === '梯门已开'
    && JSON.stringify(lfNames) === JSON.stringify({ '中文名称': '梯门已开', 'icon 库原始名称': 'elevator-door-open', '梯型': '直梯' }),
    '电梯类型、状态详情页的名称清单应是 中文名称 / icon 库原始名称 / 梯型');
  okT($('iconDetailSceneTitle').textContent === '常用于表达 · 3 个'
    && JSON.stringify(enList()) === JSON.stringify(['梯门已开', '保持开门（电梯模式）', '梯门状态-已开门（实时数据）']),
    '「常用于表达」应列出它自己的中文名，以及另外两类里用到同一张图的方框（带类别）');
  okT(lfNote.length > 0 && /完全打开/.test(lfNote[0]), '场景释义应显示 FINAL_LIFT_NOTES 里这个图标的说明');
  okT(/锁门时，可增加使用 Disabled 颜色状态/.test(w.eval('FINAL_LIFT_NOTES').elevator_door.join('')), '梯门的场景释义应说明锁门时可使用 Disabled 颜色状态');
  // 每个方框都有说明（按行 key 查，同名的 elevator-door-filded 两个节点各有各的）
  const liftNotes = w.eval('FINAL_LIFT_NOTES');
  const liftItems = w.eval('FINAL_LIFT').items;
  okT(liftItems.every((x) => Array.isArray(liftNotes[x.key]) && liftNotes[x.key].length > 0), '电梯类型、状态的每一格都应有场景释义');
  okT(Object.keys(liftNotes).length === liftItems.length, 'FINAL_LIFT_NOTES 不该有多余的条目（被排除的图标不写）');
  const filded = liftItems.filter((x) => x.name === 'elevator-door-filded');
  okT(filded.length === 2 && liftNotes[filded[0].key][0] !== liftNotes[filded[1].key][0], '同名的两个 elevator-door-filded 应各有各的说明');
  // 翻页只在电梯类型、状态里翻，顺序 直梯 → 扶梯 → 步道梯
  const lfTotal = Number($('iconDetailPos').textContent.split(' / ')[1]);
  okT(lfTotal === liftTotal, `电梯类型、状态详情页的翻页范围应是这一类（${liftTotal} 个），实际 ${lfTotal}`);
  const liftOrder = w.eval('detailList')(liftItems[0]).map((x) => x.lift);
  okT(liftOrder.join(',') === [...liftOrder].sort((a, b) => ['直梯', '扶梯', '步道梯'].indexOf(a) - ['直梯', '扶梯', '步道梯'].indexOf(b)).join(','),
    '电梯类型、状态的翻页顺序应与网格一致（直梯 → 扶梯 → 步道梯）');
  const walkBox = liftBox('walk');
  key('Escape');
  await tick();
  click(walkBox);
  await tick();
  console.log(`  点「步道梯」           位置 ${$('iconDetailPos').textContent} · 下一个${$('iconDetailNext').disabled ? '禁用' : '可用'}`);
  okT($('iconDetailPos').textContent === `${liftTotal} / ${liftTotal}` && $('iconDetailNext').disabled,
    '步道梯是这一类的最后一个，「下一个」应禁用（不会翻进实时数据）');
  key('Escape');
  await tick();
  okT(dialog.hidden && doc.activeElement === walkBox, '关掉后焦点应还给点进来的那个方框');

  // 翻页范围跟当前搜索走
  const input = $('searchInput');
  input.value = '检修';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));
  const visible = doc.querySelectorAll('[data-section="modes"] .final-item').length;
  click(doc.querySelector('[data-section="modes"] button.final-item__box'));
  await tick();
  console.log(`  搜「检修」后进详情     网格 ${visible} 个 · 位置 ${$('iconDetailPos').textContent}`
    + ` · 上一个${$('iconDetailPrev').disabled ? '禁用' : '可用'}`);
  okT($('iconDetailPos').textContent === `1 / ${visible}`, '翻页范围应是当前搜索结果');
  okT($('iconDetailPrev').disabled, '第一个时「上一个」应禁用');
  key('Escape');
  await tick();
  input.value = '';
  input.dispatchEvent(new w.Event('input', { bubbles: true }));

  okT(errs.length === 0, `过程中不应报错：${errs.join('; ')}`);
  w.close();

  // 带着 hash 直接打开页面
  const v8 = new VirtualConsole();
  const errs8 = [];
  v8.on('jsdomError', (e) => errs8.push(e.message));
  const d8 = new JSDOM(html, {
    runScripts: 'dangerously', virtualConsole: v8, pretendToBeVisual: true, url: 'http://localhost/' + fireHash,
  });
  const doc8 = d8.window.document;
  const open8 = !doc8.getElementById('iconDetail').hidden;
  const tab8 = doc8.getElementById('tab-final').getAttribute('aria-selected');
  const title8 = doc8.getElementById('iconDetailTitle').textContent;
  doc8.getElementById('iconDetailBack').dispatchEvent(new d8.window.MouseEvent('click', { bubbles: true }));
  await tick();
  console.log(`  带 hash 直接打开        ${open8 ? '直接进详情' : '没进'}（${title8}） · 页签 final=${tab8}`
    + ` · 返回后 ${doc8.getElementById('iconDetail').hidden ? '关闭' : '仍开着'}、hash「${d8.window.location.hash}」`);
  okT(open8 && title8 === '消防模式', '带着 #icon/... 打开页面应直接进那个图标的详情');
  okT(tab8 === 'true', '直接进详情时背后的页签应切到「最终整理版本」');
  okT(doc8.getElementById('iconDetail').hidden && d8.window.location.hash === '',
    '直接打开的详情页没有可后退的，返回应关闭并抹掉 hash');
  okT(errs8.length === 0, `直接打开时不应报错：${errs8.join('; ')}`);
  d8.window.close();

  if (dtFail.length) {
    console.log('\n图标详情页校验未通过：');
    for (const f of dtFail) console.log('  ! ' + f);
    process.exitCode = 1;
  } else {
    console.log('\n图标详情页校验通过');
  }
}
