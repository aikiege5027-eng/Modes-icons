/* ============================================================
   最终整理版本 → iconfont + SVG Sprite

   跑法：cd tools && npm run iconfont
   产物（全部提交进仓库，页面直接链接，不在浏览器里现算）：
     assets/iconfont/kone-icons.woff2        字体（主用）
     assets/iconfont/kone-icons.otf          字体（兜底；opentype.js 只能写 CFF 轮廓，所以是 .otf 不是 .ttf）
     assets/iconfont/kone-icons.css          @font-face + 每个图标一个 class
     assets/iconfont/kone-icons-sprite.svg   SVG Sprite，每个图标一个 <symbol>
     assets/iconfont/demo.html               演示 / 使用说明页（可搜中文含义）
     assets/iconfont/manifest.json           class / 码位 / 图形指纹，check-page 用它判断产物是否过期
     assets/iconfont/kone-icons.zip          以上前五样 + README.txt 打成一个包，页面上的「下载」就是它

   数据来源：index.html 里的 FINAL_ICONFONT（在 jsdom 里读），页面与构建用同一份 ——
   class 名、码位、收哪些图标都不在这里另算。

   字形处理（每个图标）：
     1. 取 svg 里的全部 path，按 vb 平移到 0~16 画框
     2. PathKit 逐条按各自的 fill-rule 读入、UNION 成一个整体、simplify 解掉交点
     3. evenOddToNonZero 按嵌套深度重排绕向 —— 字体只认非零规则，
        库里有 53 条 path 带 fill-rule="evenodd"（镂空靠奇偶规则），不重排的话镂空会被填实
     4. 原图（各 path 按原 fill-rule）与成品（单条 path、非零规则）各渲染一张 200px 比对，
        差异超过 FIDELITY_MAX 就整个构建失败，不出半成品
   Sprite 不走这几步：<symbol> 里放的是原样的 path（含 fill-rule），浏览器按 SVG 渲染，最精确。
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import opentype from 'opentype.js';
import { zipSync, strToU8 } from 'fflate';
import { parsePath, serializePath, evenOddToNonZero } from './geometry.mjs';

const require = createRequire(import.meta.url);
const ttf2woff2 = require('ttf2woff2').default;   // 8.x 是 ESM 转出来的 CJS，导出在 default 上
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'assets', 'iconfont');

const FAMILY = 'kone-icons';
/* unitsPerEm 2048（TrueType 常用值）：1 网格单位 = 128 字体单位，取整误差最多 1/256 网格。
   试过 1024：pin 的长斜边取整后在 200px 校验里差 0.47%，超上限；2048 压到阈值以内。 */
const UPM = 2048;
const SCALE = UPM / 16;
const BASE_Y = 14;             // 画框 y=14 落在基线上：上 14 单位、下 2 单位，共 1em
const FIDELITY_MAX = 0.001;    // 平均灰度差上限 0.1%：亚像素取整只到 0.0x%，挖错一个 1×1 单位的孔就有 0.4%
const PX = 200;
// zip 内文件的修改时间写死，内容不变时重跑得到逐字节相同的 zip，不制造无意义的 diff
const ZIP_MTIME = new Date('2026-01-01T00:00:00Z');

/* ---------- 读页面数据 ---------- */
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole(), pretendToBeVisual: true, url: 'http://localhost/' });
const icons = dom.window.eval('FINAL_ICONFONT').map((e) => ({ ...e, sections: [...e.sections], meanings: [...e.meanings] }));
const PREFIX = dom.window.eval('FINAL_ICONFONT_PREFIX');
dom.window.close();

/* ---------- PathKit ---------- */
const PathKit = await require('pathkit-wasm/bin/pathkit.js')({
  wasmBinary: readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm')),
});

/* svg 内容 → [{ d, evenodd }]，坐标平移到 0~16。
   最终整理版本的图标只有 g / path 两种元素、没有 transform（构建前查过），
   所以这里只认 path；万一以后混进别的元素，直接报错，不静默漏掉。 */
function pathsOf(icon) {
  const [vx, vy, vw, vh] = icon.vb.split(/\s+/).map(Number);
  if (vw !== 16 || vh !== 16) throw new Error(`${icon.cls}：viewBox 不是 16 单位画框（${icon.vb}）`);
  const doc = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg">${icon.svg}</svg>`, { contentType: 'image/svg+xml' }).window.document;
  const els = [...doc.documentElement.querySelectorAll('*')];
  const odd = els.filter((el) => !['g', 'path'].includes(el.tagName) || el.hasAttribute('transform'));
  if (odd.length) throw new Error(`${icon.cls}：含不支持的元素 / transform：${odd.map((e) => e.tagName).join(',')}`);
  return els.filter((el) => el.tagName === 'path').map((el) => {
    const sp = parsePath(el.getAttribute('d')).map((s) => ({
      start: { x: s.start.x - vx, y: s.start.y - vy },
      segs: s.segs.map((g) => (g.type === 'L'
        ? { type: 'L', x: g.x - vx, y: g.y - vy }
        : { type: 'C', x1: g.x1 - vx, y1: g.y1 - vy, x2: g.x2 - vx, y2: g.y2 - vy, x: g.x - vx, y: g.y - vy })),
      closed: s.closed,
    }));
    return { d: serializePath(sp, 6), evenodd: el.getAttribute('fill-rule') === 'evenodd' };
  });
}

/* 多条 path → 单条非零规则 path（坐标仍在 16 画框里） */
function mergeToNonZero(paths) {
  let acc = null;
  for (const p of paths) {
    const k = PathKit.FromSVGString(p.d);
    k.setFillType(p.evenodd ? PathKit.FillType.EVENODD : PathKit.FillType.WINDING);
    if (!acc) { acc = k; continue; }
    acc.op(k, PathKit.PathOp.UNION);
    k.delete();
  }
  acc.simplify();
  const d = acc.toSVGString();
  acc.delete();
  return serializePath(evenOddToNonZero(parsePath(d)), 4);
}

function renderPixels(body) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="${PX}" height="${PX}">${body}</svg>`;
  return new Resvg(svg, { background: 'white' }).render().pixels;
}
/* 校验指标：按 5×5 像素块求平均灰度、再比块与块的差，取所有块的平均差（0~1）。
   ⚠ 改过两次，都记下来：
   1. 原来数「差值超过 tol 的像素个数」。safety-helmet 的 Figma 原稿里有 9.49998 这种浮点误差，
      取整成 9.5（差 0.00002 单位）后，一整行像素跨过 resvg 的覆盖率量化台阶，被算成 152 个
      「不同像素」—— 实际形状没变。
   2. 改成逐像素平均灰度差，那一行仍贡献 0.12%，因为 resvg 在边缘恰好压在像素边界附近时
      是整行翻转，不是平滑过渡。
   现在按 5×5 块（200px 画布上约 0.4 个网格单位）先平均再比：一行像素翻转被摊进块里，
   贡献降到可以忽略；真正的形状错（镂空被填实、轮廓丢一段）是整块从白变黑，照样很显眼 ——
   挖错一个 1×1 单位的孔，按这个指标约 0.6%。 */
const BLOCK = 5;
function pixelDiffRatio(a, b) {
  const n = PX / BLOCK;
  let sum = 0;
  for (let by = 0; by < n; by++) {
    for (let bx = 0; bx < n; bx++) {
      let sa = 0, sb = 0;
      for (let y = by * BLOCK; y < (by + 1) * BLOCK; y++) {
        for (let x = bx * BLOCK; x < (bx + 1) * BLOCK; x++) {
          const i = (y * PX + x) * 4;
          sa += a[i]; sb += b[i];
        }
      }
      sum += Math.abs(sa - sb) / (255 * BLOCK * BLOCK);
    }
  }
  return sum / (n * n);
}

const snap = (v) => Math.round(v * SCALE) / SCALE;
function snapD(d) {
  return serializePath(parsePath(d).map((sp) => ({
    start: { x: snap(sp.start.x), y: BASE_Y - snap(BASE_Y - sp.start.y) },
    segs: sp.segs.map((g) => (g.type === 'L' ? { type: 'L', x: snap(g.x), y: BASE_Y - snap(BASE_Y - g.y) }
      : { type: 'C', x1: snap(g.x1), y1: BASE_Y - snap(BASE_Y - g.y1), x2: snap(g.x2), y2: BASE_Y - snap(BASE_Y - g.y2), x: snap(g.x), y: BASE_Y - snap(BASE_Y - g.y) })),
    closed: sp.closed,
  })), 6);
}

/* 16 画框里的单条 path → opentype.js 的 Path（y 轴翻转：字体 y 朝上）
   ⚠ 坐标必须先取整成整数字体单位再交给 opentype.js：它写 CFF 时按「与上一点的差」逐段取整，
   传小数进去，误差会一段段累积（实测 sales 的轮廓漂了 1.84%）；
   先取整绝对坐标，差值就都是整数，不再漂。误差上限 = 半个字体单位 = 1/256 网格。 */
function toGlyphPath(d) {
  const path = new opentype.Path();
  const X = (x) => Math.round(x * SCALE);
  const Y = (y) => Math.round((BASE_Y - y) * SCALE);
  for (const sp of parsePath(d)) {
    path.moveTo(X(sp.start.x), Y(sp.start.y));
    for (const s of sp.segs) {
      if (s.type === 'L') path.lineTo(X(s.x), Y(s.y));
      else path.curveTo(X(s.x1), Y(s.y1), X(s.x2), Y(s.y2), X(s.x), Y(s.y));
    }
    path.close();
  }
  return path;
}

/* ---------- 逐个处理 ---------- */
const glyphs = [new opentype.Glyph({ name: '.notdef', unicode: 0, advanceWidth: UPM, path: new opentype.Path() })];
const report = [];
for (const icon of icons) {
  const paths = pathsOf(icon);
  const merged = mergeToNonZero(paths);
  /* 校验基准：原图各 path（按原 fill-rule），坐标先吸到字体网格（1/128 单位）上。
     取整误差有解析上限（≤ 1/256 单位，见 toGlyphPath），不需要靠渲染去测；
     基准也取整之后，比对只剩「合并 + 改绕向 + 写读字体」这几步是否改了形状。
     ⚠ 不取整的话：safety-helmet 原稿的 12.24998 与取整后的 12.25 恰好落在 resvg 的
     覆盖率台阶上，一整行像素翻转，被误报成 0.12% 的形状差异（几何上两者只差 0.00002）。 */
  icon.refBody = paths.map((p) => `<path d="${snapD(p.d)}" fill="black"${p.evenodd ? ' fill-rule="evenodd"' : ''}/>`).join('');
  report.push({ cls: icon.cls, paths: paths.length, evenodd: paths.filter((p) => p.evenodd).length });
  glyphs.push(new opentype.Glyph({
    name: icon.cls.slice(PREFIX.length).replace(/-/g, '_'),
    unicode: icon.code,
    advanceWidth: UPM,
    path: toGlyphPath(merged),
  }));
  icon.hash = createHash('sha1').update(icon.vb + '|' + icon.svg).digest('hex').slice(0, 12);
}

/* opentype.js 把 head.modified 写成「现在」，每次构建字体字节都不同、zip 也跟着变，
   提交时会出现内容没变的 diff。这里把 modified 改成与 created 相同（都来自 ZIP_MTIME），
   再按 OpenType 规范重算 head 表校验和与整字体的 checksumAdjustment。 */
function pinHeadModified(buf) {
  const sum = (b) => { let s = 0; for (let i = 0; i < b.length; i += 4) s = (s + ((b[i] << 24) | ((b[i + 1] || 0) << 16) | ((b[i + 2] || 0) << 8) | (b[i + 3] || 0))) >>> 0; return s; };
  const n = buf.readUInt16BE(4);
  for (let i = 0; i < n; i++) {
    const rec = 12 + i * 16;
    if (buf.toString('ascii', rec, rec + 4) !== 'head') continue;
    const off = buf.readUInt32BE(rec + 8);
    const len = buf.readUInt32BE(rec + 12);
    buf.copy(buf, off + 28, off + 20, off + 28);        // modified ← created
    buf.writeUInt32BE(0, off + 8);                      // checksumAdjustment 先清零
    buf.writeUInt32BE(sum(buf.subarray(off, off + ((len + 3) & ~3))), rec + 4);
    buf.writeUInt32BE((0xB1B0AFBA - sum(buf)) >>> 0, off + 8);
    return buf;
  }
  throw new Error('字体里没有 head 表');
}

/* ---------- 字体 ---------- */
const font = new opentype.Font({
  familyName: FAMILY,
  styleName: 'Regular',
  unitsPerEm: UPM,
  ascender: BASE_Y * SCALE,
  descender: -(16 - BASE_Y) * SCALE,
  glyphs,
  // 时间戳写死，同样的输入得到同样的字体文件
  createdTimestamp: Math.floor(ZIP_MTIME.getTime() / 1000),
});
const otf = pinHeadModified(Buffer.from(font.toArrayBuffer()));
const woff2 = ttf2woff2(otf);
/* 回读一遍，比对的是**写进字体文件的字形**，不是中间结果：
   字体坐标是整数单位（1 单位 = 1/64 网格），取整也算在里面，这才是用户拿到的东西。
   字形转回 16 画框（y 翻回朝下），按非零规则渲染，与原图（各 path 按原 fill-rule）逐像素比。
   ⚠ 别改回比 mergeToNonZero 的输出：Figma 原稿里有 9.49998 这种浮点误差，
   取整成 9.5 后在 200px 下会跨过一整行像素的抗锯齿阈值（safety-helmet 因此差 0.38%），
   那是取整把它吸回了网格，不是形状错 —— 只看中间结果分不出这两种情况。 */
const back = opentype.parse(otf.buffer.slice(otf.byteOffset, otf.byteOffset + otf.byteLength));
if (back.glyphs.length !== icons.length + 1) throw new Error(`字体回读字形数 ${back.glyphs.length}，应为 ${icons.length + 1}`);
const fx = (v) => +(v / SCALE).toFixed(6);
const fy = (v) => +(BASE_Y - v / SCALE).toFixed(6);
let worst = { cls: '', diff: 0 };
for (const icon of icons) {
  const cmds = back.charToGlyph(String.fromCodePoint(icon.code)).path.commands;
  if (!cmds.length) throw new Error(`${icon.cls}：字体里 U+${icon.code.toString(16)} 是空字形`);
  const d = cmds.map((c) => (c.type === 'M' ? `M${fx(c.x)} ${fy(c.y)}`
    : c.type === 'L' ? `L${fx(c.x)} ${fy(c.y)}`
      : c.type === 'C' ? `C${fx(c.x1)} ${fy(c.y1)} ${fx(c.x2)} ${fy(c.y2)} ${fx(c.x)} ${fy(c.y)}`
        : c.type === 'Q' ? `Q${fx(c.x1)} ${fy(c.y1)} ${fx(c.x)} ${fy(c.y)}` : 'Z')).join('');
  const diff = pixelDiffRatio(renderPixels(icon.refBody), renderPixels(`<path d="${d}" fill="black" fill-rule="nonzero"/>`));
  report.find((r) => r.cls === icon.cls).diff = diff;
  if (diff > worst.diff) worst = { cls: icon.cls, diff };
  if (diff > FIDELITY_MAX) throw new Error(`${icon.cls}：字体里的字形与原图差 ${(diff * 100).toFixed(2)}%，超过 ${FIDELITY_MAX * 100}%`);
}

/* ---------- CSS ---------- */
const hex = (c) => c.toString(16).toUpperCase();
const css = `/* KONE China · 电梯相关图标 iconfont（最终整理版本，${icons.length} 个）
   由 tools/build-iconfont.mjs 生成，请勿手改。
   用法：<i class="kone-icon ${icons[0].cls}" aria-hidden="true"></i>
   大小用 font-size（16 网格，16 / 32 / 48px 这类整数倍最清楚），颜色用 color。 */
@font-face {
  font-family: "${FAMILY}";
  src: url("./kone-icons.woff2") format("woff2"),
       url("./kone-icons.otf") format("opentype");
  font-weight: normal;
  font-style: normal;
  font-display: block;
}
.kone-icon {
  display: inline-block;
  font-family: "${FAMILY}" !important;
  font-size: 16px;
  font-style: normal;
  font-weight: normal;
  font-variant: normal;
  line-height: 1;
  text-transform: none;
  vertical-align: -0.125em;
  speak: never;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
${icons.map((i) => `.${i.cls}::before { content: "\\${hex(i.code)}"; }`).join('\n')}
`;

/* ---------- SVG Sprite ---------- */
const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none">
<!-- KONE China · 电梯相关图标 SVG Sprite（最终整理版本，${icons.length} 个），由 tools/build-iconfont.mjs 生成。
     用法：<svg width="16" height="16" aria-hidden="true"><use href="kone-icons-sprite.svg#${icons[0].cls}"/></svg>
     颜色跟随 CSS color（path 填的是 currentColor）。 -->
${icons.map((i) => `<symbol id="${i.cls}" viewBox="${i.vb}">${i.svg}</symbol>`).join('\n')}
</svg>
`;

/* ---------- 演示页 ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const demo = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KONE 电梯相关图标 · iconfont / SVG Sprite 使用说明</title>
<link rel="stylesheet" href="./kone-icons.css">
<style>
/* KONE China Design Token（只取本页用到的几个） */
:root {
  --brand-color: #1450f5; --text-color-primary: #141414; --text-color-secondary: #676a72;
  --text-color-placeholder: #8f9195; --bg-color-page: #f5f7fa; --bg-color-container: #ffffff;
  --bg-color-secondarycontainer: #f5f7fa; --component-border: #c8cad0; --component-stroke: #dfe1e8;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg-color-page); color: var(--text-color-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; font-size: 14px; line-height: 22px; }
main { max-width: 1100px; margin: 0 auto; padding: 48px 24px 96px; }
h1 { margin: 0 0 8px; font-size: 28px; line-height: 36px; font-weight: 600; }
h2 { margin: 40px 0 12px; font-size: 18px; line-height: 26px; font-weight: 600; }
p { margin: 0 0 8px; color: var(--text-color-secondary); }
pre { margin: 0 0 12px; padding: 12px 16px; background: var(--bg-color-container); border: 1px solid var(--component-stroke);
  border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 20px; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.search { display: block; width: 360px; max-width: 100%; height: 32px; margin: 0 0 16px; padding: 4px 8px; font: inherit;
  border: 1px solid var(--component-border); border-radius: 4px; background: var(--bg-color-container); color: inherit; }
.search:hover { border-color: #4373f7; }
.search:focus { outline: none; border-color: var(--brand-color); box-shadow: 0 0 0 2px #d0dcfd; }
.count { margin-bottom: 12px; font-size: 12px; line-height: 20px; color: var(--text-color-placeholder); }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 0; padding: 0; list-style: none; }
.card { padding: 16px 12px 12px; background: var(--bg-color-container); border: 1px solid var(--component-stroke); border-radius: 8px; }
.card__icon { display: flex; align-items: center; justify-content: center; height: 48px; margin-bottom: 12px; }
.card__icon .kone-icon { font-size: 32px; }
.card__cls { display: block; width: 100%; padding: 2px 6px; font: 12px/20px ui-monospace, SFMono-Regular, Menlo, monospace;
  text-align: left; color: var(--text-color-primary); background: var(--bg-color-secondarycontainer); border: none; border-radius: 4px;
  cursor: pointer; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.card__cls:hover { color: var(--brand-color); }
.card__meaning { margin-top: 6px; font-size: 12px; line-height: 20px; color: var(--text-color-secondary); }
.card[hidden] { display: none; }
.toast { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%); padding: 6px 12px; border-radius: 6px;
  background: var(--text-color-primary); color: #fff; font-size: 12px; line-height: 20px; }
.toast[hidden] { display: none; }
</style>
</head>
<body>
${sprite.replace('<svg xmlns="http://www.w3.org/2000/svg" style="display:none">', '<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">')}
<main>
<h1>KONE 电梯相关图标 · iconfont / SVG Sprite</h1>
<p>收录「最终整理版本」的全部 ${icons.length} 个图标（同一张图只收一次）。class 名是 icon 库原始名称；同一个 class 可能对应多个中文含义，卡片下方列出了全部含义，可以直接搜中文。</p>

<h2>方式一：iconfont</h2>
<p>引入 CSS，写 class 即可。大小用 font-size，颜色用 color。图标画在 16 网格上，16 / 32 / 48px 这类整数倍最清楚。</p>
<pre><code>&lt;link rel="stylesheet" href="kone-icons.css"&gt;

&lt;i class="kone-icon ${icons[0].cls}" aria-hidden="true"&gt;&lt;/i&gt;
&lt;i class="kone-icon ${icons[0].cls}" style="font-size: 32px; color: #1450f5" aria-hidden="true"&gt;&lt;/i&gt;</code></pre>

<h2>方式二：SVG Sprite</h2>
<p>保留原始矢量，渲染最精确。把 kone-icons-sprite.svg 和页面放在同一个站点下（file:// 打开时浏览器会拦截跨文件引用），用 &lt;use&gt; 引用；也可以把整个文件内联进页面，再写 href="#class 名"。</p>
<pre><code>&lt;svg width="16" height="16" aria-hidden="true"&gt;
  &lt;use href="kone-icons-sprite.svg#${icons[0].cls}"/&gt;
&lt;/svg&gt;</code></pre>
<p>图标只是装饰时加 aria-hidden="true"；单独承担含义（如只有图标的按钮）时，给外层按钮写 aria-label。</p>

<h2>全部图标</h2>
<input class="search" id="q" type="search" placeholder="搜 class 名或中文含义，如「司机」" aria-label="搜索图标">
<div class="count" id="count"></div>
<ul class="grid" id="grid">
${icons.map((i) => `<li class="card" data-q="${esc((i.cls + ' ' + i.name + ' ' + i.meanings.join(' ')).toLowerCase())}">
  <div class="card__icon"><i class="kone-icon ${i.cls}" aria-hidden="true"></i></div>
  <button type="button" class="card__cls" data-copy="${i.cls}" title="点击复制 class 名">${i.cls}</button>
  <div class="card__meaning">${esc(i.meanings.join(' / '))}</div>
</li>`).join('\n')}
</ul>
</main>
<div class="toast" id="toast" role="status" hidden></div>
<script>
(function () {
  var q = document.getElementById('q'), cards = [].slice.call(document.querySelectorAll('.card')), count = document.getElementById('count');
  function filter() {
    var kw = q.value.trim().toLowerCase(), n = 0;
    cards.forEach(function (c) { var hit = !kw || c.getAttribute('data-q').indexOf(kw) !== -1; c.hidden = !hit; if (hit) n++; });
    count.textContent = kw ? n + ' / ' + cards.length + ' 个' : cards.length + ' 个';
  }
  q.addEventListener('input', filter); filter();
  var toast = document.getElementById('toast'), timer;
  document.getElementById('grid').addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy]'); if (!b) return;
    var text = b.getAttribute('data-copy');
    var done = function () { toast.textContent = '已复制 ' + text; toast.hidden = false; clearTimeout(timer); timer = setTimeout(function () { toast.hidden = true; }, 1500); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done);
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (err) {} t.remove(); done(); }
  });
})();
</script>
</body>
</html>
`;

const readme = `KONE China · 电梯相关图标（最终整理版本，${icons.length} 个）

kone-icons.css          iconfont 样式：引入后写 <i class="kone-icon ${icons[0].cls}"></i>
kone-icons.woff2 / .otf 字体文件，与 CSS 放在同一目录
kone-icons-sprite.svg   SVG Sprite：<svg><use href="kone-icons-sprite.svg#${icons[0].cls}"/></svg>
demo.html               全部图标与 class 名，可搜中文含义；点 class 名复制

class 名是 icon 库原始名称，一个 class 可能对应多个中文含义，以 demo.html 里的列表为准。
大小用 font-size（16 / 32 / 48px 这类整数倍最清楚），颜色用 color。
`;

/* ---------- 写出 ---------- */
mkdirSync(OUT, { recursive: true });
const files = {
  'kone-icons.woff2': woff2,
  'kone-icons.otf': otf,
  'kone-icons.css': Buffer.from(css),
  'kone-icons-sprite.svg': Buffer.from(sprite),
  'demo.html': Buffer.from(demo),
};
for (const [name, buf] of Object.entries(files)) writeFileSync(join(OUT, name), buf);
const zipEntries = {};
for (const [name, buf] of Object.entries({ ...files, 'README.txt': Buffer.from(readme) })) {
  zipEntries['kone-icons/' + name] = [new Uint8Array(buf), { mtime: ZIP_MTIME }];
}
writeFileSync(join(OUT, 'kone-icons.zip'), zipSync(zipEntries, { level: 9 }));
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  family: FAMILY,
  count: icons.length,
  icons: icons.map((i) => ({ cls: i.cls, code: 'U+' + hex(i.code), id: i.id, name: i.name, hash: i.hash })),
}, null, 2) + '\n');

report.sort((a, b) => b.diff - a.diff).slice(0, 6).forEach((r) => console.log('    ' + r.cls.padEnd(40) + (r.diff * 100).toFixed(3) + '%  path×' + r.paths + ' evenodd×' + r.evenodd));
const multi = report.filter((r) => r.paths > 1).length;
const odd = report.filter((r) => r.evenodd > 0).length;
console.log(`iconfont 已生成：${icons.length} 个字形（多条 path 合并 ${multi} 个、含 evenodd 的 ${odd} 个）`);
console.log(`  字形与原图最大差异 ${(worst.diff * 100).toFixed(3)}%（${worst.cls}），上限 ${FIDELITY_MAX * 100}%`);
console.log(`  woff2 ${woff2.length} B · otf ${otf.length} B · zip ${readFileSync(join(OUT, 'kone-icons.zip')).length} B`);
console.log(`  → ${OUT}`);
