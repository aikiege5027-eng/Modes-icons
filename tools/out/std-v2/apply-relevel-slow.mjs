/* 把 relevel_slow 的标准版换成设计在 IOT Delivery 新画的版本（12007:216496）。
   与 apply.mjs 同一套写法：整行定位 + 断言命中唯一，找不到或找到多行就报错退出。
   绝不用跨对象的惰性正则 —— 之前用 /  key: \{[\s\S]*?\n  \},\n/ 那种写法
   一次删掉过 23 条图标定义。
   （单独一支脚本而不是往 apply.mjs 里加：apply.mjs 里那两条已经写进去了，
     重跑它会因为锚不到旧行而报错 —— 这正是想要的保护，所以不动它。）
   用法：cd tools/out/std-v2 && node apply-relevel-slow.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../../../index.html', import.meta.url);
const lines = readFileSync(file, 'utf8').split('\n');

const glyph = readFileSync(new URL('./relevel_slow-inline.txt', import.meta.url), 'utf8').trim();
if (/'/.test(glyph)) throw new Error('内联 svg 里有单引号，会撑破 index.html 的字符串字面量');
if (/<rect/.test(glyph)) throw new Error('内联 svg 里还有 rect（底色没剥掉）');
if (/#141414/.test(glyph)) throw new Error('内联 svg 里还有硬编码色值');
if (/-2093|-10799/.test(glyph)) throw new Error('内联 svg 里有画板背景 path（拿错了 export 那一份）');

const LEAD = [
  "  /* 低速返平层 —— 设计在 IOT Delivery 里画的 relevel-slow（12007:216496），2026-09 替换。",
  "     原来这一格是 TDesign align-bottom 走流水线改造的单条 path（底线 + 一根长下箭头）。",
  "     新版改成与上一行 relevel 同构：同一组上下向中线收拢的箭头 + 同一条贯通中线，",
  "     只把两根竖杆断开成「短段 + 1 单位间隙 + 短段」来表达「低速」。",
  "     ⚠️ 这一改动把两行的区分方式从「双向 / 单向 + 中线 / 底线」换成了「竖杆连续 / 断开」，",
  "     20px 下两张图的逐像素墨量平均绝对差只有 0.0072（脚本 tools/out/std-v2/pair-check.mjs）。",
  "     旧版与 relevel 的同一口径是 0.1463，扶手带那次定的「算两张不同的图」基线是 0.18 上下",
  "     （click vs thermometer 0.1821、click vs 自身镜像 0.2240）。",
  "     0.0072 只比抗锯齿量级（这几张图自我拟合是 0.0013~0.0014）高一档 —— 差别就是两处",
  "     1.25px 的缺口，20px 显示框里基本读不出来。按图落库了，但这一对撞形要设计侧确认：",
  "     要么把间隙加宽，要么让低速态另带一个可读的记号。",
  "     ⚠️ 它是**5 条 path**（上下箭头各拆成箭头段与竖杆段、加中线），不是合并后的单条，",
  "     所以已从 tools/check-page.mjs 的 STRICT_EXTERNAL 名单移出。",
  "     导出读数与核对（脚本 tools/out/std-v2/check.mjs）：",
  "       用的是 download_assets 返回的 svgAssets 那一份，不是同一次返回里的 export ——",
  "       export 是「整个节点连画布一起导」，带 16×16 深色底 rect 和画板外层坐标上万的背景 path",
  "       （-2093 -10799 那种），照搬会得到一整块背景压住图形；两份的 <g id=\"relevel-slow_2\">",
  "       内容已逐字节比过，完全相同；",
  "       vb 用画框坐标 0 0 16 16；墨迹正好 12 × 14（x 2~14 / y 1~15），",
  "       长边 14 单位 → 16px 框 14px / 20px 框 17.5px，与 relevel 完全同尺；",
  "       ⚠️ 四种变换的拟合误差全是 0.0014 —— 图形上下左右都严格对称，翻转视觉等价，",
  "       分辨不出方向也不影响，按 none 落库。",
  "     仍未入库、未过 icon 评审，src 标 'IOT Delivery'，页面上继续带争议黄点。 */",
];
const NEW = "  relevel_slow: { name: 'relevel-slow', src: 'IOT Delivery', node: '12007:216496', vb: '0 0 16 16', svg: '" + glyph + "' },";
const PREFIX = "  relevel_slow: { name: 'relevel-slow', src: 'TDesign Icons 0.4.7 · align-bottom'";

const hits = lines.reduce((acc, l, i) => (l.startsWith(PREFIX) ? acc.concat(i) : acc), []);
if (hits.length !== 1) throw new Error(`定位失败：命中 ${hits.length} 行，期望 1`);
lines.splice(hits[0], 1, ...LEAD, NEW);
writeFileSync(file, lines.join('\n'));
console.log(`替换第 ${hits[0] + 1} 行，并在前面插入 ${LEAD.length} 行注释`);
