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
ok(iconCells.length === 82, `标准版已填充期望 82，实际 ${iconCells.length}`);
ok(emptyCells.length === 2, `标准版未填充期望 2，实际 ${emptyCells.length}`);

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
const WANT_FILTERS = ['全部', '已填充', '未填充', '争议项'];
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
for (const [label, expect] of [['全部', 84], ['已填充', 82], ['未填充', 2], ['争议项', 14]]) {
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
   现在的构成：TDesign 改造 2（pendant、shaft-learning）
             + IOT Delivery 5（auto_circle、robot、setting-off、relevel、relevel-slow）
             + 新画 2（zone-high、zone-low）= 9。
   ⚠️ 总数一直是 9，但构成换过四次：robot、setting-off、relevel、relevel-slow 依次从
   「TDesign 改造」挪到了「IOT Delivery」—— 设计在 IOT Delivery 各重画了一张
   （12007:216383 / 216438 / 216476 / 216496）替换掉原来的改造件。
   两种来源都算「非库内」，所以这条 9 的断言照旧成立；
   换句话说这条断言只盯「有几行不是库内引用」，盯不住来源在非库内之间的挪动，
   来源构成得靠上面这段注释和各条目自己的说明来记。 */
const externalTitles = [...titles.filter((t) => /TDesign Icons|IOT Delivery|新画/.test(t))];
ok(externalTitles.length === 9, `非库内来源期望 9 行，实际 ${externalTitles.length}`);
for (const t of titles) if (/undefined/.test(t)) fail.push(`tooltip 里有 undefined：${t}`);
selectFilter('全部');

// ---- 新增图标的渲染与规范符合性 ----
selectFilter('全部');
/* 库内引用的那批不在这里逐个列名 —— 选型一直在调整，写死名单等于每次换图标都要改测试；
   下面改成「页面上渲染出来的每一个标准版图标都过一遍基本检查」，名单从页面自己取。 */
/* 走 tools/normalize-icon.mjs 流水线出来的图标，都要满足更严的一档：
   单条 path、viewBox 0 0 16 16、不依赖 evenodd。
   前 2 个是 TDesign 素材改造，后 2 个是本项目新画 —— 新画的没有理由少走校验，
   所以一并放进来（名字里的 external 是历史叫法，现在的含义是「非库内引用」）。
   ⚠️ robot、setting-off、relevel、relevel-slow 都已从这份名单移出：它们换成了设计在
   IOT Delivery 画的版本（12007:216383 / 216438 / 216476 / 216496），
   分别是 6 / 5 / 3 / 5 条 path，robot 那条还带 evenodd —— 都不是流水线产物，
   这三条更严的规矩对它们不成立，它们按下面「名单取自页面」那一轮的通用检查过
   （path 存在、currentColor、16 单位画框）。
   移出的理由必须是「来源变了」，不能是「校验挂了就删名单」：
   如果哪天有人把它们改回流水线产物，记得加回来。 */
const STRICT_EXTERNAL = ['pendant', 'shaft-learning',
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
ok(renderedNames.length === 61, `标准版图标应有 61 个不同的，实际 ${renderedNames.length}`);
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
   放进属性选择器要转义，而 jsdom 没有 window.CSS.escape。 */
const dotOf = (rowKey) => [...document.querySelectorAll('.dispute-dot')]
  .find((el) => el.getAttribute('data-dispute-row') === rowKey);
const litDots = () => [...document.querySelectorAll('.dispute-dot[aria-pressed="true"]')];
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const disputedCount = () => {
  document.getElementById('stdFilterBtn')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  const it = [...document.querySelectorAll('#stdFilterMenu .th-filter__item')]
    .find((x) => labelOf(x) === '争议项');
  const n = Number(it.querySelector('.th-filter__count').textContent.trim());
  document.getElementById('stdFilterBtn')
    .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  return n;
};

// 每一行都该有按钮，含未填充的 2 行
const allDots = [...document.querySelectorAll('.dispute-dot')];
console.log('  按钮总数              ', allDots.length);
ok(allDots.length === 84, `每行都该有一个争议标记按钮，期望 84，实际 ${allDots.length}`);
/* 取一个仍然空着的行。原来这里取的是 DOP CS，它已按指定填了 card，
   所以换成 RES E —— 现在还空着的只有 RES E / H4 两行。 */
const emptyRowDot = dotOf('RES E');
ok(!!emptyRowDot, '未填充的行（RES E）也应该有争议标记按钮');

/* 默认 14 个点亮：sales（司机）+ 优先外呼 / 优先内呼 + 降速 + 停止运行 + OSS Pending
   + 优先高区 / 优先低区（本项目新画的 zone-high / zone-low，未过评审）
   + 外部素材改造的 4 个 + 井道自学习 / 再平层 / 低速返平层。
   全都是自动判定，没有 --manual。 */
console.log('  默认点亮              ', litDots().length, '（筛选计数', disputedCount(), '）');
ok(litDots().length === 14, `默认应有 14 个点亮，实际 ${litDots().length}`);
ok(disputedCount() === 14, '默认「争议项」筛选计数应为 14');
ok(!document.querySelector('.dispute-dot--manual'), '默认不应有手动标注');

// A 点亮一个原本没标记的行
click(dotOf('Normal Service'));
let d = dotOf('Normal Service');
console.log('  点亮 Normal Service   ', 'aria-pressed=' + d.getAttribute('aria-pressed'),
  '手动=' + d.classList.contains('dispute-dot--manual'), '计数', disputedCount());
ok(d.getAttribute('aria-pressed') === 'true', '点击后 Normal Service 应点亮');
ok(d.classList.contains('dispute-dot--manual'), '手动点亮的点应带 --manual 标识');
ok(disputedCount() === 15, `点亮后计数应为 15，实际 ${disputedCount()}`);

// B 熄灭一个自动判定的行
click(dotOf('Attendant Service (ATS)'));
d = dotOf('Attendant Service (ATS)');
console.log('  熄灭 ATS（自动判定）   ', 'aria-pressed=' + d.getAttribute('aria-pressed'), '计数', disputedCount());
ok(d.getAttribute('aria-pressed') === 'false', '自动判定的点应该能被手动熄灭');
ok(disputedCount() === 14, `熄灭后计数应为 14，实际 ${disputedCount()}`);

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
ok(disputedCount() === 13, `此时计数应为 13，实际 ${disputedCount()}`);

// D 在「争议项」筛选下熄灭一行，该行应从结果里消失
let got = selectFilter('争议项');
const before = got.filter((tr) => !tr.classList.contains('empty-row')).length;
click(dotOf('Pendant'));
got = [...document.querySelectorAll('#tbody tr')];
const after = got.filter((tr) => !tr.classList.contains('empty-row')).length;
console.log('  争议项筛选下熄灭一行  ', before, '→', after);
ok(after === before - 1, `在争议项筛选下熄灭一行应少一行，实际 ${before} → ${after}`);
ok(!dotOf('Pendant'), '熄灭的行应已从争议项筛选结果中移除');

// E 全部清除
selectFilter('全部');
document.getElementById('stdFilterBtn')
  .dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const resetBtn = document.querySelector('#stdFilterMenu .th-filter__reset');
console.log('  清除入口文案          ', resetBtn ? resetBtn.textContent.trim() : '(无)');
ok(!!resetBtn, '有手动标记时菜单底部应出现清除入口');
click(resetBtn);
console.log('  清除后点亮            ', litDots().length, '（筛选计数', disputedCount(), '）');
ok(litDots().length === 14, `清除后应回到 14 个点亮，实际 ${litDots().length}`);
ok(!document.querySelector('.dispute-dot--manual'), '清除后不应残留手动标注');

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
  const dots2 = doc2.querySelectorAll('.dispute-dot').length;
  const first = [...doc2.querySelectorAll('.dispute-dot')]
    .find((el) => el.getAttribute('data-dispute-row') === 'Normal Service');
  first.dispatchEvent(new noStore.window.MouseEvent('click', { bubbles: true }));
  const litAfter = doc2.querySelectorAll('.dispute-dot[aria-pressed="true"]').length;
  console.log(`  无 localStorage 环境   渲染 ${rows2} 行 / ${dots2} 个按钮，点击后点亮 ${litAfter}，报错 ${errs.length}`);
  ok(errs.length === 0, `无 localStorage 时不应报错：${errs.join('; ')}`);
  ok(rows2 === 84 && dots2 === 84, '无 localStorage 时表格仍应正常渲染');
  ok(litAfter === 15, `无 localStorage 时切换仍应生效（本次会话内），期望 15，实际 ${litAfter}`);
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
  okD(withBtn.length === 82, `只有已填充的 82 行该有按钮，实际 ${withBtn.length}`);
  okD(btns.length === 82 * 2, `SVG + PNG 两个按钮，期望 ${82 * 2}，实际 ${btns.length}`);

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
  okD(emptyIdx.length === 2, `未填充应为 2 行，实际 ${emptyIdx.length}`);
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
selectFilter('争议项');
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
