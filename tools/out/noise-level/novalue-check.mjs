/* 在 jsdom 里跑 index.html，把「其他实时数据图标」表的每一行按
   梯型 / 实时数据名称 / 实时数据细分 + 标准版那一格的图标名列出来，
   专门核对无值态约定：细分是「无数值」或「无数据」的行，标准版必须是 bias，一行不漏。
   ⚠️ 期望行数会随行的增删变化：一开始是 7 行，删掉左 / 右扶手温度的两个无数值行后是 5 行。
   用法：cd tools/out/noise-level && node novalue-check.mjs */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../package.json', import.meta.url));
const { JSDOM, VirtualConsole } = require('jsdom');

const html = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const vc = new VirtualConsole();
const errs = [];
vc.on('jsdomError', (e) => errs.push(e.message));
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: vc, pretendToBeVisual: true, url: 'http://localhost/' });
const { document } = dom.window;
if (errs.length) { console.log('脚本报错：\n  ' + errs.join('\n  ')); process.exit(1); }

const fail = [];
/* 梯型与实时数据名称两列是 rowspan 合并的，组内行没有这两格 —— 顺着往下带 */
let lift = ''; let field = '';
let novalue = 0;
for (const tr of document.querySelectorAll('#tbodyLive tr')) {
  const tds = [...tr.children];
  const type = tds.find((td) => td.classList.contains('cell-type'));
  const named = tds.find((td) => td.classList.contains('mode-zh'));
  if (type) lift = type.textContent.trim();
  if (named) field = named.textContent.trim();
  const sub = tds.find((td) => td.classList.contains('mode-en')).textContent.trim();
  const stdTd = tds.find((td) => td.classList.contains('cell-std'));
  const icons = [...stdTd.querySelectorAll('.std-mode')]
    .map((el) => el.querySelector('.std-mode__name, .std-mode__label')?.textContent.trim()
      || (el.getAttribute('title') || '').replace(/^标准版图标：/, '').split(' · ')[0]);
  const shown = icons.length ? icons.join(' ＋ ') : '（空槽）';
  const isNoValue = sub === '无数值' || sub === '无数据';
  if (isNoValue) {
    novalue++;
    if (shown !== 'bias') fail.push(`${lift} / ${field} / ${sub} 应为 bias，实际 ${shown}`);
  } else if (shown === 'bias') {
    fail.push(`${lift} / ${field} / ${sub} 不是无值态却落了 bias`);
  }
  console.log((isNoValue ? '· ' : '  ') + `${lift} / ${field} / ${sub}`.padEnd(34) + shown);
}
console.log('\n无值态行数 ' + novalue + '（期望 5）');
if (novalue !== 5) fail.push('无值态行数 ' + novalue + '，期望 5');
console.log(fail.length ? '✗ ' + fail.join('\n✗ ') : '无值态约定校验通过');
dom.window.close();
process.exit(fail.length ? 1 : 0);
