/* 第二批要补回 IOT_LIVE_ICONS 的 5 条：escalator / escalator1 / arrowUp / arrowDown / stop
   （它们排在 usergroup 之后，也落在误删的那一段里）。
   与第一批同一条路子：读当初的产物 tools/out/iot-live/10602_487*.svg，
   把最外层 <g id> 换成 index.html 里当初存的那个（产物里是 Figma 原始图层名），
   fill 换成 currentColor，折成一行。每条都用原文指纹自检。
   ⚠️ escalator1 的**内层 path id 是 escalator1**，不是 Union —— 原文如此，别顺手改统一。
   用法：cd tools/out/noise-level && node recover-iot-tail.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('../iot-live/', import.meta.url);
const inner = (file, outerId) => readFileSync(new URL(file, SRC), 'utf8')
  .replace(/[\s\S]*?<svg[^>]*>/, '')
  .replace(/<\/svg>\s*$/, '')
  .replace(/\n\s*/g, '')
  .replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="currentColor"')
  .replace(/^<g id="[^"]*"/, '<g id="' + outerId + '"')
  /* Figma 导出会给重名的 id 加 _2 这类后缀（escalator1 的内层 path 就是 escalator1_2），
     当初存进 index.html 时去掉了这个后缀，这里照样去掉，才能与原文逐字一致。 */
  .replace(/ id="([A-Za-z0-9-]+)_\d+"/g, ' id="$1"')
  .trim();

const ENTRIES = [
  { key: 'escalator', name: 'escalator', file: '10602_48779.svg', id: 'escalator',
    comment: '  /* escalator · 10602:48779（运行状态 运行中）—— 扶梯本体 + 左上角上行小箭头 */',
    fp: '<g id="escalator"><path id="Union" fill-rule="evenodd" clip-rule="evenodd" d="M5.3125 3.75H9.0625C9.32071 3.75' },
  { key: 'escalator1', name: 'escalator1', file: '10602_48780.svg', id: 'escalator1',
    comment: '  /* escalator1 · 10602:48780（运行状态 未运行）—— 与 escalator 是两张独立的图，去掉了小箭头 */',
    fp: '<g id="escalator1"><path id="escalator1" d="M15.3125 5C16.8702 5 18.125 6.25482 18.125 7.8125C18.125 9.37018' },
  { key: 'arrowUp', name: 'arrow-up', file: '10602_48781.svg', id: 'arrow-up',
    comment: '  /* arrow-up · 10602:48781（运行方向 上行）*/',
    fp: '<g id="arrow-up"><path id="Union" fill-rule="evenodd" clip-rule="evenodd" d="M10.442 4.55806C10.198 4.31398' },
  { key: 'arrowDown', name: 'arrow-down', file: '10602_48782.svg', id: 'arrow-down',
    comment: '  /* arrow-down · 10602:48782（运行方向 下行）—— 与 arrow-up 是两张独立的图，不是翻转 */',
    fp: '<g id="arrow-down"><path id="Union" fill-rule="evenodd" clip-rule="evenodd" d="M10.625 13.491L13.7499 10.3661' },
  { key: 'stop', name: 'stop', file: '10602_48783.svg', id: 'stop',
    comment: '  /* stop · 10602:48783（运行方向 停止）*/',
    fp: '<g id="stop"><g id="Union"><path d="M8.75 6.25H7.5V13.75H8.75V6.25Z" fill="currentColor"/>' },
];

const lines = [];
let bad = 0;
for (const e of ENTRIES) {
  const svg = inner(e.file, e.id);
  const ok = svg.startsWith(e.fp);
  console.log((ok ? '✓' : '✗') + ' 自检 ' + e.key.padEnd(12)
    + (ok ? '与原文一致' : '不一致\n  产物: ' + svg.slice(0, 130) + '\n  原文: ' + e.fp));
  if (!ok) bad++;
  lines.push(e.comment);
  lines.push(`  ${e.key}: { name: '${e.name}', svg: '${svg.replace(/'/g, "\\'")}' },`);
}
writeFileSync(new URL('./recovered-iot-tail.js', import.meta.url), lines.join('\n') + '\n');
console.log('\n写出 recovered-iot-tail.js' + (bad ? `  ⚠️ ${bad} 条自检不一致` : '  自检全部通过'));
process.exit(bad ? 1 : 0);
