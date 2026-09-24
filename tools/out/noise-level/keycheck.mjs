/* 恢复之后的自检：行数据里引用的图标键，三个图标表里是不是都有。
   「Cannot read properties of undefined (reading 'name')」这类报错就是键对不上。
   用法：cd tools/out/noise-level && node keycheck.mjs */
import { readFileSync } from 'node:fs';
const s = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');

const keysOf = (name) => {
  const a = s.indexOf('const ' + name + ' = {');
  const b = s.indexOf('\n};', a);
  return [...s.slice(a, b).matchAll(/^ {2}([A-Za-z_][A-Za-z0-9_]*):/gm)].map((m) => m[1]);
};
const std = keysOf('LIVE_STD_ICONS');
const iot = keysOf('IOT_LIVE_ICONS');
const yun = keysOf('LIVE_ICONS');
console.log('LIVE_STD_ICONS  ' + std.length + ' 条');
console.log('IOT_LIVE_ICONS  ' + iot.length + ' 条');
console.log('LIVE_ICONS      ' + yun.length + ' 条');

const rows = s.slice(s.indexOf('const LIVE_ROWS'), s.indexOf('/* 「不分状态」是本表的记号'));
const pick = (re) => new Set([...rows.matchAll(re)].map((m) => m[1]));
const usedStd = new Set([
  ...pick(/std: '([A-Za-z0-9_]+)'/g),
  ...[...rows.matchAll(/std: \[([^\]]+)\]/g)].flatMap((m) => [...m[1].matchAll(/'([A-Za-z0-9_]+)'/g)].map((x) => x[1])),
]);
const usedIot = pick(/iot: \{ i: '([A-Za-z0-9_]+)'/g);
const usedYun = pick(/yun: \{ i: '([A-Za-z0-9_]+)'/g);

const miss = (used, have) => [...used].filter((k) => !have.includes(k));
const report = [
  ['LIVE_STD_ICONS', miss(usedStd, std)],
  ['IOT_LIVE_ICONS', miss(usedIot, iot)],
  ['LIVE_ICONS（云视界）', miss(usedYun, yun)],
];
let bad = 0;
for (const [name, list] of report) {
  console.log('行里引用但 ' + name + ' 里没有：' + (list.length ? list.join(' ') : '（无）'));
  bad += list.length;
}
/* 反向：表里有、但没有任何行引用的（不算错，但恢复后想确认没多补东西） */
const unusedStd = std.filter((k) => !usedStd.has(k));
console.log('\nLIVE_STD_ICONS 里没有行引用的：' + (unusedStd.length ? unusedStd.join(' ') : '（无）'));
process.exit(bad ? 1 : 0);
