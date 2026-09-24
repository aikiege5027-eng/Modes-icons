/* 标准版两列要「等分」+ 名字不折行，到底等分成多少才不会被浏览器顶宽？
   这支脚本把候选宽度逐个试一遍：给预览文件追加一条覆盖样式（两列同宽 w），
   用 Chrome --headless --dump-dom 读回真实列宽，看声明值与渲染值是否一致。
   要卡的就是上一轮记在 #panel-live .col-std-alt 注释里的那个行为 ——
   fixed 布局下跨列格子 min-content 的缺口会被压到最后一个被跨的列上。
   用法：cd tools/out/noise-level && node std-width-sweep.mjs [w1 w2 ...] */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const root = new URL('../../../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const probe = readFileSync(new URL('./probe.js', import.meta.url), 'utf8');
const widths = process.argv.slice(2).map(Number);
const list = widths.length ? widths : [106, 118, 125, 130, 135, 136];

for (const w of list) {
  const override = `<style>#panel-live .col-std, #panel-live .col-std-alt { width: ${w}px; }</style>`;
  const page = html.replace('</head>', override + '</head>')
    .replace('</body>', '<script>\n' + probe + '\n<' + '/script>\n</body>');
  const file = new URL('.tmp-std-sweep.html', root);
  writeFileSync(file, page);
  const dom = execFileSync(CHROME, [
    '--headless=new', '--disable-gpu', '--window-size=1920,1000',
    '--virtual-time-budget=4000', '--dump-dom', 'file://' + file.pathname,
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
  const cols = (dom.match(/@@ colCSS ([^<\n]*)/) || [, '?'])[1];
  const pair = (dom.match(/@@ pairRows ([^<\n]*)/) || [, '?'])[1];
  const wrapped = (dom.match(/@@ stdLabel ([^<\n]*)/) || [, '?'])[1];
  const table = (dom.match(/@@ table=(\d+)/) || [, '?'])[1];
  const std = /col-std:([\d.]+)px col-std-alt:([\d.]+)px/.exec(cols) || [];
  const grew = std[1] && (Math.abs(Number(std[1]) - w) > 0.5 || Math.abs(Number(std[2]) - w) > 0.5);
  console.log(`声明 ${String(w).padStart(3)}px → 渲染 ${std[1]}/${std[2]}  表宽 ${table}`
    + `  ${grew ? '✗ 被顶宽' : '✓ 与声明一致'}  ${pair}  ${wrapped}`);
  unlinkSync(file);
}
