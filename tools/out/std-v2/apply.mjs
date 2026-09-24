/* 把 setting_off / relevel 两行的标准版图标换成设计在 IOT Delivery 新画的版本。
   写法上刻意只做「整行定位 + 断言唯一」：先按行首前缀找出唯一一行，找不到或找到多行就报错退出，
   绝不用跨对象的惰性正则 —— 之前用 /  key: \{[\s\S]*?\n  \},\n/ 那种写法把后面整段对象都吃掉过，
   一次删掉了 23 条图标定义。
   用法：cd tools/out/std-v2 && node apply.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../../../index.html', import.meta.url);
const lines = readFileSync(file, 'utf8').split('\n');

const settingOff = readFileSync(new URL('./setting_off-inline.txt', import.meta.url), 'utf8').trim();
const relevel = readFileSync(new URL('./relevel-inline.txt', import.meta.url), 'utf8').trim();
for (const [k, v] of Object.entries({ settingOff, relevel })) {
  if (/'/.test(v)) throw new Error(k + ' 的内联 svg 里有单引号，会撑破 index.html 的字符串字面量');
  if (/<rect/.test(v)) throw new Error(k + ' 的内联 svg 里还有 rect（白底没剥掉）');
  if (/#141414/.test(v)) throw new Error(k + ' 的内联 svg 里还有硬编码色值');
}

const EDITS = [
  {
    prefix: "  setting_off: { name: 'setting-off', src: 'TDesign Icons 0.4.7 · setting + slash'",
    lead: [
      "  /* 未设置 —— 设计在 IOT Delivery 里画的 No-Setting（12007:216438），2026-09 替换。",
      "     原来这一格是 TDesign 的 setting（六边形套圆）叠 slash 再走 normalize-icon 流水线",
      "     合出来的单条 path。语义方向一直是对的（KFPS 的 no-setup 徽标就是「六边形齿轮 + 斜杠」），",
      "     但那是拿两个外部素材拼的；现在设计按库规范直接画了一张，就不必再留改造件。",
      "     ⚠️ 与改造件的口径差异：它是**5 条 path**（六边形机体上下两半、斜杠、齿轮内圈两半），",
      "     不是合并后的单条，所以已从 tools/check-page.mjs 的 STRICT_EXTERNAL 名单移出 ——",
      "     那份名单卡的是「流水线产物必须是单条 path、不依赖 evenodd」。",
      "     导出读数与核对（脚本 tools/out/std-v2/check.mjs）：",
      "       导出根 svg 就是 16×16 / viewBox 0 0 16 16，是**画框坐标**，vb 直接用 0 0 16 16，",
      "       不需要像紧包围盒那样算居中偏移；这一份导出没带白底 rect（relevel 那份带，见下）；",
      "       墨迹 12.13 × 13.78（x 2.00~14.13 / y 0.96~14.74），长边 13.78 单位",
      "       → 16px 框 13.8px / 20px 框 17.2px，与库内那批（12~15 单位）同档；",
      "       节点不带旋转镜像（none 0.0173 最贴合，mirrorX 0.0794 / rot180 0.0923 / mirrorY 0.1052）。",
      "       ⚠️ none 的 0.0173 比 robot 那次的 0.0024 大一档，是斜杠与六边形的斜边抗锯齿差异，",
      "       不是错位 —— 四种变换里它领先第二名 4.6 倍，方向判定没有歧义。",
      "     仍未入库、未过 icon 评审，src 标 'IOT Delivery'，页面上继续带争议黄点。 */",
    ],
    line: () => "  setting_off: { name: 'setting-off', src: 'IOT Delivery', node: '12007:216438', vb: '0 0 16 16', svg: '" + settingOff + "' },",
  },
  {
    prefix: "  relevel: { name: 'relevel', src: 'TDesign Icons 0.4.7 · align-vertical'",
    lead: [
      "  /* 再平层 —— 设计在 IOT Delivery 里画的 Relevel（12007:216476），2026-09 替换。",
      "     原来这一格是 TDesign align-vertical 走流水线改造的单条 path，构图（中线 + 上下向中线",
      "     收拢的箭头）与新版一致，换的是画法不是语义 —— 新版按 16 网格直接画，箭头更满、",
      "     中线贯通到 x 2~14。与下一行 relevel-slow（单向下箭头 + 底线）的「双向 / 单向」区分照旧。",
      "     ⚠️ 它是**3 条 path**（下箭头、中线、上箭头），不是合并后的单条，",
      "     所以已从 tools/check-page.mjs 的 STRICT_EXTERNAL 名单移出。",
      "     导出读数与核对（脚本 tools/out/std-v2/check.mjs）：",
      "       导出根 svg 是 16×16 / viewBox 0 0 16 16，画框坐标，vb 直接用 0 0 16 16；",
      "       ⚠️ 导出里带一个铺满画框的白底 <rect width=\"16\" height=\"16\" fill=\"white\"/>，",
      "       必须剥掉只留 <g id=\"Relevel_2\"> 里的 path —— 与 bias、robot 两次同一个坑，",
      "       照搬会得到一个白方块压住图形；",
      "       墨迹正好 12 × 14（x 2~14 / y 1~15），长边 14 单位 → 16px 框 14px / 20px 框 17.5px；",
      "       ⚠️ 四种变换的拟合误差全是 0.0013 —— 这个图形上下左右都严格对称，翻转视觉等价，",
      "       所以分辨不出方向也不影响，按 none 落库。",
      "     仍未入库、未过 icon 评审，src 标 'IOT Delivery'，页面上继续带争议黄点。 */",
    ],
    line: () => "  relevel: { name: 'relevel', src: 'IOT Delivery', node: '12007:216476', vb: '0 0 16 16', svg: '" + relevel + "' },",
  },
];

for (const e of EDITS) {
  const hits = lines.reduce((acc, l, i) => (l.startsWith(e.prefix) ? acc.concat(i) : acc), []);
  if (hits.length !== 1) throw new Error(`定位失败：${e.prefix} 命中 ${hits.length} 行，期望 1`);
  const i = hits[0];
  lines.splice(i, 1, ...e.lead, e.line());
  console.log(`替换第 ${i + 1} 行，并在前面插入 ${e.lead.length} 行注释`);
}

writeFileSync(file, lines.join('\n'));
console.log('写回 index.html');
