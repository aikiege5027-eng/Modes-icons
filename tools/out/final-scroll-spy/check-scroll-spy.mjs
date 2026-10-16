/* 一次性核对：「最终整理版本」左导航的 scroll-spy 与点导航滚动，在真实 Chrome 里跑。

   为什么不放进 check-page.mjs：jsdom 没有排版，scroll-spy 在那里只能靠伪造
   getBoundingClientRect 测逻辑分支（已经测了）；真实的滚动位置、scroll-margin-top、
   平滑滚动是否真的停在判定线上，只有浏览器量得出来。

   为什么不用 `chrome --headless --virtual-time-budget --dump-dom`：那个模式下
   requestAnimationFrame 几乎不推进（实测 12 秒只跑 5 帧），平滑滚动也不动，
   会得出「导航不跟着变、点了不滚」的假结论。这里改用 DevTools 协议驱动、等真实的秒数。

   用法：cd tools && node out/final-scroll-spy/check-scroll-spy.mjs
   需要本机装有 Chrome（路径见 CHROME），Node 18+（自带 fetch / WebSocket）。 */
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const ROOT = new URL('../../../', import.meta.url).pathname;
const WORK = '/tmp/modes-icons-scroll-spy';

// 用页面本体拼一个测试页：末尾追加一段脚本，按顺序滚动 / 点导航，把结果写进 document.title
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
cpSync(ROOT + 'assets', WORK + '/assets', { recursive: true });
const harness = `
<script>
window.addEventListener('load', function () {
  document.getElementById('tab-final').click();
  const cur = function () { const b = document.querySelector('#finalNav [aria-current="true"]'); return b ? b.dataset.cat : null; };
  const topOf = function (k) { return Math.round(document.querySelector('[data-section="' + k + '"]').getBoundingClientRect().top); };
  const line = function () { return Math.round(document.querySelector('.tabs').getBoundingClientRect().bottom + 16); };
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  const log = [];
  (async function () {
    await wait(150);
    log.push(['页面顶部', cur(), 'modes']);
    const liftY = window.scrollY + topOf('lift') - line();
    window.scrollTo(0, liftY - 40); await wait(200); log.push(['电梯类型标题差 40px 到线', cur(), 'modes']);
    window.scrollTo(0, liftY + 2);  await wait(200); log.push(['电梯类型标题刚过线', cur(), 'lift']);
    window.scrollTo(0, document.documentElement.scrollHeight); await wait(200); log.push(['滚到页底', cur(), 'live']);
    window.scrollTo(0, 0); await wait(200);
    for (const k of ['lift', 'live', 'modes']) {
      document.querySelector('#finalNav [data-cat="' + k + '"]').click();
      await wait(1600);
      log.push(['点导航 ' + k + '（标题停在 ' + topOf(k) + '，线在 ' + line() + '）', cur(), k, topOf(k) === line()]);
    }
    document.title = JSON.stringify(log);
  })();
});
</script>`;
writeFileSync(WORK + '/index.html', readFileSync(ROOT + 'index.html', 'utf8') + harness);

const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
  '--window-size=1440,900', `--user-data-dir=${WORK}/profile`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find((t) => t.type === 'page'); } catch { /* 还没起来 */ }
}
if (!target) { console.error('Chrome 没起来'); chrome.kill(); process.exit(1); }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = {};
ws.addEventListener('message', (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending[d.id]) { pending[d.id](d.result); delete pending[d.id]; }
});
const send = (method, params = {}) => new Promise((r) => { pending[++id] = r; ws.send(JSON.stringify({ id, method, params })); });

await send('Page.enable');
await send('Page.navigate', { url: 'file://' + WORK + '/index.html' });
await sleep(9000);   // 测试页自己跑完约 6 秒
const title = (await send('Runtime.evaluate', { expression: 'document.title' })).result.value;
ws.close();
chrome.kill();

let fail = 0;
try {
  for (const [label, got, want, landed] of JSON.parse(title)) {
    const ok = got === want && landed !== false;
    if (!ok) fail++;
    console.log(`${ok ? '  ✓' : '  ✗'} ${label.padEnd(36)} 导航亮 ${got}（应为 ${want}）`);
  }
} catch {
  console.error('测试页没跑完，document.title =', title);
  fail++;
}
rmSync(WORK, { recursive: true, force: true });
console.log(fail ? `\n${fail} 项不通过` : '\nscroll-spy 校验通过');
process.exitCode = fail ? 1 : 0;
