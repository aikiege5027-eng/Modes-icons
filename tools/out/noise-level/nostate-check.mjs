/* 核对「不分状态」这四个字有没有从表面上彻底消失：
   细分那一列、以及 IoT / 云视界 两列的取值文字，都不许出现它；
   同时确认那几行的数据还在（r.s 仍是不分状态 → 靠 tooltip 里的说明句判断）。
   用法：cd tools/out/noise-level && node nostate-check.mjs */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' });
const { document } = dom.window;
const tbody = document.getElementById('tbodyLive');
const fail = [];

const shown = [...tbody.querySelectorAll('th.mode-en, .iot-mode__label, .yun-mode__label')]
  .map((el) => el.textContent.trim());
const leaked = shown.filter((t) => t.includes('不分状态'));
console.log('可见文案里出现「不分状态」的次数 ' + leaked.length + '（期望 0）');
if (leaked.length) fail.push('仍有 ' + leaked.length + ' 处把「不分状态」印在表上');

/* 数据没被改空：tooltip 里那句说明应当出现在这几行的平台格上 */
const marked = [...tbody.querySelectorAll('[title*="各取值共用同一张图"]')];
console.log('tooltip 带「各取值共用同一张图」说明的格子 ' + marked.length);
if (!marked.length) fail.push('一个都没有 —— 说明 liveValueTitle 没生效，信息丢了');

/* 细分留空的行 = 7 行「不分状态」+ 6 行「整个字段只有一行」
   （轿门传感器温度 / 湿度 / 速度、扶梯 左 / 右扶手温度、扶梯 客流）= 13 行。
   「扶梯 齿轮箱振动（均值）」原来也是单行字段，那一行已整行删掉；
   客流则是删掉「单位（万人）」之后才变成单行字段的。 */
const blankSub = [...tbody.querySelectorAll('th.mode-en')].filter((th) => !th.textContent.trim());
console.log('细分留空的行 ' + blankSub.length + '（期望 13）');
if (blankSub.length !== 13) fail.push('细分留空 ' + blankSub.length + ' 行，期望 13');
blankSub.forEach((th) => {
  if (!th.querySelector('.cell-blank')) fail.push('留空的细分格没有 .cell-blank 撑高');
});

/* 注释列真的没了 */
console.log('注释格 ' + tbody.querySelectorAll('td.cell-note').length + '（期望 0）'
  + ' / 表头列数 ' + document.querySelectorAll('#panel-live thead th').length);
if (tbody.querySelector('td.cell-note')) fail.push('还有 td.cell-note —— 注释列没删干净');
if ([...document.querySelectorAll('#panel-live thead th')].some((th) => th.textContent.trim() === '注释')) {
  fail.push('表头里还有「注释」');
}

console.log(fail.length ? '✗ ' + fail.join('\n✗ ') : '校验通过');

/* 附：把整张表的「实时数据名称 / 细分（显示值）/ IoT 取值 / 云视界取值」列一遍，
   人工扫一眼哪几行的细分是空的、空得对不对。跑 `node nostate-check.mjs --list`。 */
if (process.argv.includes('--list')) {
  const rows = [...document.querySelectorAll('#tbodyLive tr')];
  let lift = ''; let field = '';
  for (const tr of rows) {
    const tds = [...tr.children];
    const type = tds.find((td) => td.classList.contains('cell-type'));
    const named = tds.find((td) => td.classList.contains('mode-zh'));
    if (type) lift = type.textContent.trim();
    if (named) field = named.textContent.trim();
    const sub = tds.find((td) => td.classList.contains('mode-en')).textContent.trim();
    const iot = tr.querySelector('.iot-mode__label');
    const yun = tr.querySelector('.yun-mode__label');
    console.log(`${lift} / ${field}`.padEnd(26) + '细分 ' + (sub || '—').padEnd(10)
      + ' IoT ' + ((iot && iot.textContent.trim()) || '—').padEnd(10)
      + ' 云视界 ' + ((yun && yun.textContent.trim()) || '—'));
  }
}

dom.window.close();
process.exit(fail.length ? 1 : 0);
