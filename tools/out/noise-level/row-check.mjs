/* 把 index.html 在 jsdom 里跑起来，只抽「其他实时数据图标」表里这一轮改动的三行，
   看标准版那一格真的渲出了预期的图标（不是空槽），并把 tooltip 的来源标记打出来。
   用法：cd tools/out/noise-level && node row-check.mjs */
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

const WANT = ['噪音', '平层感应'];
const rows = [...document.querySelectorAll('#tbodyLive tr')];
console.log('表内行数 ' + rows.length);
/* 梯型 / 实时数据名称两列是 rowspan 合并的，组内行没有这两格 —— 所以名称要顺着往下带。 */
let field = '';
for (const tr of rows) {
  const tds = [...tr.children];
  const texts = tds.map((td) => td.textContent.trim());
  /* 带 rowspan 的组首行：格数多，第 2 格（或第 1 格）是字段名 */
  const named = tds.find((td) => td.classList.contains("mode-zh"));
  if (named) field = named.textContent.trim();
  if (!WANT.includes(field)) continue;
  const sub = tds.find((td) => td.classList.contains("mode-en"));
  const stdTd = tds.find((td) => td.classList.contains('cell-std'));
  const icons = [...stdTd.querySelectorAll('.std-mode')];
  const slot = stdTd.querySelector('.icon-slot');
  console.log(
    (field + ' / ' + (sub ? sub.textContent.trim() : '?')).padEnd(22),
    icons.length ? icons.map((el) => {
      const svg = el.querySelector('svg');
      return el.getAttribute('title') + ' [viewBox ' + svg.getAttribute('viewBox')
        + ' · path×' + svg.querySelectorAll('path').length + ']';
    }).join(' ＋ ') : '空槽(' + (slot ? slot.className : 'none') + ')',
  );
  void texts;
}
/* pretendToBeVisual 会留着 requestAnimationFrame 的定时器，不显式关掉进程不退出 */
dom.window.close();
process.exit(0);
