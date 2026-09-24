/* 恢复 IOT_LIVE_ICONS 里被误删的 6 条（handrailLeft / handrailRight / gearbox / wind /
   sound / usergroup）。
   来源：当初取图时留下的产物 tools/out/iot-live/10602_487*.svg ——
   它们就是 20 单位画框坐标的那一版（与 index.html 里存的格式一致：内层是 <g id="…">，
   条目上不写 vb），fill 是设计稿的 #3C3BC6 / #141414，按本表约定换成 currentColor。
   ⚠️ 这支脚本先**自检**：对其中 4 条（我手上有原文的那几条）比对生成结果与原文是否一致，
   一致才说明「产物 → 字符串」这条路子还原得对，再用同一条路子生成另外 2 条。
   用法：cd tools/out/noise-level && node recover-iot-entries.mjs */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = new URL('../iot-live/', import.meta.url);
/* index.html 里存的是**规范化过的** <g id>（handrail-left / gearbox-vibration / wind …），
   而产物里的 id 是 Figma 原始图层名（中文被转成 &#…; 实体，或者 "wifi- filled/wind"）。
   所以还原时要把最外层那个 id 换成当初存的那个 —— path 数据本身是一致的（wind 已逐字验证）。 */
const inner = (file, outerId) => {
  const raw = readFileSync(new URL(file, SRC), 'utf8');
  const body = raw.replace(/[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return body
    .replace(/\n\s*/g, '')                       // 折成一行
    .replace(/fill="#[0-9A-Fa-f]{6}"/g, 'fill="currentColor"')
    .replace(/^<g id="[^"]*"/, '<g id="' + outerId + '"')
    .trim();
};

const ENTRIES = [
  { key: 'handrailLeft', name: '左扶手带温度', file: '10602_48771.svg', id: 'handrail-left',
    comment: '  /* 左扶手带温度（Figma 图层名就是中文，不是图标库里的名字）· 10602:48771 */' },
  { key: 'handrailRight', name: '右扶手带温度', file: '10602_48772.svg', id: 'handrail-right',
    comment: '  /* 右扶手带温度 · 10602:48772 —— 与左扶手是两张独立的图（各自画的，不是镜像变换），\n     字节数也不同（1670 / 1617） */' },
  { key: 'gearbox', name: '齿轮箱振动', file: '10602_48773.svg', id: 'gearbox-vibration',
    comment: '  /* 齿轮箱振动（Figma 图层名是中文）· 10602:48773（齿轮箱振动）/ 48774（均值）—— 同一张图。\n     48774 那个 cell 对应的行已按要求删掉（理由见 LIVE_ROWS 里齿轮箱振动那条注释），\n     所以本图现在只有一行在引用；节点号留着备查。 */' },
  { key: 'wind', name: 'wifi- filled/wind', file: '10602_48775.svg', id: 'wind',
    comment: '  /* wind · 10602:48775（能耗）—— Figma 图层名是 "wifi- filled/wind"，画的是 wind */' },
  { key: 'sound', name: 'sound', file: '10602_48776.svg', id: 'sound',
    comment: '  /* sound · 10602:48776（噪音）*/' },
  { key: 'usergroup', name: 'usergroup', file: '10602_48777.svg', id: 'usergroup',
    comment: '  /* usergroup · 10602:48777（客流）*/' },
];

/* 自检用的原文片段（取自被删之前读到的内容，各取开头一段做指纹） */
const FINGERPRINTS = {
  handrailLeft: '<g id="handrail-left"><path id="Union" d="M11.011 3.75V4.375H9.76098V3.75V1.875V1.25H11.011V1.875V3.75Z',
  handrailRight: '<g id="handrail-right"><path id="Union" d="M9.375 3.75V4.375H10.625V3.75V1.875V1.25H9.375V1.875V3.75Z',
  gearbox: '<g id="gearbox-vibration"><g id="Union"><path fill-rule="evenodd" clip-rule="evenodd" d="M9.99996 7.5C11.3625 7.5',
  wind: '<g id="wind"><path id="Union" d="M13 5C11.6193 5 10.5 6.11929 10.5 7.5H9.5C9.5 5.567 11.067 4 13 4C14.933 4',
};

const lines = [];
let bad = 0;
for (const e of ENTRIES) {
  const svg = inner(e.file, e.id);
  const fp = FINGERPRINTS[e.key];
  if (fp) {
    const ok = svg.startsWith(fp);
    console.log((ok ? '✓' : '✗') + ' 自检 ' + e.key.padEnd(14) + (ok ? '与原文一致' : '与原文不一致\n  产物: ' + svg.slice(0, 120) + '\n  原文: ' + fp));
    if (!ok) bad++;
  } else {
    console.log('· 无原文可比 ' + e.key.padEnd(10) + '（按同一条路子生成）' + svg.slice(0, 60) + '…');
  }
  lines.push(e.comment);
  lines.push(`  ${e.key}: { name: '${e.name}', svg: '${svg.replace(/'/g, "\\'")}' },`);
}
writeFileSync(new URL('./recovered-iot-entries.js', import.meta.url), lines.join('\n') + '\n');
console.log('\n写出 recovered-iot-entries.js' + (bad ? `  ⚠️ ${bad} 条自检不一致，别直接用` : '  自检全部通过'));
