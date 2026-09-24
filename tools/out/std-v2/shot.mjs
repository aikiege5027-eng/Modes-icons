/* 出一张「未设置 / 再平层 两行在表里的实际渲染」截图。
   做法：复制一份 index.html，在末尾追加一段脚本，把模式表里除这两行以外的行删掉，
   页面就只剩表头 + 两行，直接整页截图，不用去猜裁剪坐标。
   临时文件用完即删。
   用法：cd tools/out/std-v2 && node shot.mjs */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const root = new URL('../../../', import.meta.url);
const tmp = new URL('.tmp-std-v2-shot.html', root);
const html = readFileSync(new URL('index.html', root), 'utf8');
const inject = `
<script>
(function () {
  /* ⚠️ 不能按 children[2] 取中文名：Priority / 梯型 那两列带 rowspan，
     组内后续行的 td 下标会前移。改成「行里任意一格的文本正好等于目标名」。 */
  var keep = ['未设置', '再平层', '低速返平层'];
  var rows = document.querySelectorAll('#tbody tr');
  for (var i = 0; i < rows.length; i++) {
    var hit = false;
    var tds = rows[i].children;
    for (var j = 0; j < tds.length; j++) {
      if (keep.indexOf(tds[j].textContent.trim()) !== -1) { hit = true; break; }
    }
    if (!hit) rows[i].remove();
  }
  document.title = '剩余行 ' + document.querySelectorAll('#tbody tr').length;
})();
</script>
`;
writeFileSync(tmp, html.replace(/<\/body>/, inject + '</body>'));
try {
  execFileSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--disable-gpu', '--hide-scrollbars',
    '--window-size=1900,700', '--virtual-time-budget=5000',
    '--screenshot=' + new URL('./in-table.png', import.meta.url).pathname,
    tmp.href,
  ], { stdio: 'ignore' });
  console.log('写出 in-table.png');
} finally {
  unlinkSync(tmp);
  console.log('已删临时文件 .tmp-std-v2-shot.html');
}
