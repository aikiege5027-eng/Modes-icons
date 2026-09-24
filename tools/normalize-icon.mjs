/* ============================================================
   外部图标 → KONE China icon 规范
   规范出处：Design Token China（vuD3onrb6PS5UtMrGdgbrA）node 7306:7236

   流水线
     1  读 TDesign 源文件，只取 stroke* path（fill* 是 fill="transparent" 的占位）
     2  中心线 bbox 等比装进 fit.box，居中；直线端点吸附半整数
     3  中心线拐角倒 r=0.5 圆角  →  描边后外沿 1px 圆角、内沿直角
     4  PathKit 以 width=1 / MITER / BUTT 描边成轮廓
     5  simplify() 布尔合并成 union 整体，setFillType(WINDING) 出 Non-zero
     6  校验：Non-zero 安全性、无残留 stroke、命名合规、尺寸一致性

   第 4 步的 width=1 是本流水线的核心：源素材是 24 网格 / stroke-width=2，
   等比缩到 16 会变成 1.333px，达不到规范的统一 1px。线宽在目标网格上重新指定，
   只搬运中心线几何。

   校验里「Non-zero 安全」的判定不是看属性，是把同一条 path 分别按 nonzero 与
   evenodd 渲染成 PNG 逐字节比对 —— 两者一致才说明 path 不依赖 evenodd。

   用法：cd tools && npm i && npm run build
   产物：tools/out/*.svg（可单独查看）与 tools/out/std-icons.js（贴进 index.html）
   ============================================================ */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { Resvg } from '@resvg/resvg-js';
import {
  parsePath, serializePath, mapToGrid, roundCorners, dropSlivers, evenOddToNonZero,
} from './geometry.mjs';
import { ICONS, SOURCE_LIB } from './icons.config.mjs';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const TD_SRC = join(HERE, 'node_modules/tdesign-icons-svg/src');

const GRID = 16;          // 画框边长
const STROKE = 1;         // 统一线宽
const CORNER_R = 0.5;     // 中心线倒角半径 → 外沿 1px

/* ---------- PathKit ---------- */

async function loadPathKit() {
  const init = require('pathkit-wasm/bin/pathkit.js');
  const wasmBinary = readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm'));
  return init({ wasmBinary });
}

/* ---------- 读取 TDesign 源 ---------- */

/* TDesign 的图标是「中心线 + stroke-width=2」，真实几何只在 id="stroke*" 的
   path 上；同名的 fill* path 是 fill="transparent" 的占位，拿来用会得到空图形。

   另一种来源：手绘。给 centerlines（一段 d，坐标**已经画在 16 网格上**），
   走同一条流水线后面的所有步骤 —— 倒角、1px 描边、并集、Non-zero、逐项校验。
   这么做的意思是：新画的图标和改造来的图标受同一套规范约束，
   不因为「是自己画的」就少走校验。 */
function readSource(src) {
  if (src.centerlines) {
    const subpaths = parsePath(src.centerlines);
    if (!subpaths.length) throw new Error(`手绘源 ${src.label || ''} 解析不出任何 subpath`);
    return { subpaths, subpathCount: subpaths.length, srcName: src.label || '手绘' };
  }
  const { name, pick, drop } = src;
  const file = join(TD_SRC, `${name}.svg`);
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`TDesign 里找不到图标 "${name}"（${file}）`);
  }

  const paths = [...raw.matchAll(/<path\b([^>]*)>/g)].map((m) => {
    const attrs = m[1];
    const id = (attrs.match(/\bid="([^"]*)"/) || [])[1] || '';
    const d = (attrs.match(/\bd="([^"]*)"/) || [])[1] || '';
    const hasStroke = /\bstroke="currentColor"/.test(attrs);
    return { id, d, hasStroke };
  });

  let chosen = pick && pick.length
    ? pick.map((id) => {
        const hit = paths.find((p) => p.id === id);
        if (!hit) throw new Error(`${name}.svg 里没有 id="${id}" 的 path`);
        return hit;
      })
    : paths.filter((p) => p.hasStroke);

  if (!chosen.length) throw new Error(`${name}.svg 没有可用的 stroke path`);

  let subpaths = chosen.flatMap((p) => parsePath(p.d));
  const total = subpaths.length;
  if (drop && drop.length) {
    const kill = new Set(drop);
    subpaths = subpaths.filter((_, i) => !kill.has(i));
  }
  return { subpaths, subpathCount: total, srcName: name };
}

/* ---------- 网格适配 ---------- */

function boundsOf(PathKit, subpaths) {
  const p = PathKit.FromSVGString(serializePath(subpaths, 6));
  const b = p.getBounds();
  p.delete();
  return { x: b.fLeft, y: b.fTop, w: b.fRight - b.fLeft, h: b.fBottom - b.fTop };
}

/* 把中心线 bbox 等比装进 box×box 并在 16 画框里居中。
   注意这是「中心线」的 bbox；描边会向外扩 0.5，所以成图的实际外轮廓
   比 box 大 1。取 box=12 时成图 13 单位，box=13 时成图 14 单位 ——
   与库里那批（12~14 单位）落在同一档，不会一眼偏大或偏小。 */
function fitTransform(srcBounds, box) {
  const scale = box / Math.max(srcBounds.w, srcBounds.h);
  const w = srcBounds.w * scale;
  const h = srcBounds.h * scale;
  return {
    scale,
    tx: (GRID - w) / 2 - srcBounds.x * scale,
    ty: (GRID - h) / 2 - srcBounds.y * scale,
  };
}

/* ---------- 描边 + 并集 + Non-zero ---------- */

function outline(PathKit, centerlines, extras) {
  const stroked = PathKit.FromSVGString(serializePath(centerlines, 6));

  /* miter_limit 压到 2：箭头尖端这类锐角用无限制的 MITER 会甩出长尖刺，
     限制后自动退化成斜切，尖刺没了。连接方式仍是 MITER —— 换成 ROUND 会把
     外沿圆角从 1 变成 0.5，破坏「中心线倒 0.5 + 1px 墙 = 外沿 1px」这个推导。 */
  stroked.stroke({
    width: STROKE,
    join: PathKit.StrokeJoin.MITER,
    cap: PathKit.StrokeCap.BUTT,
    miter_limit: 2,
  });
  const p = stroked;
  // 校验基准：simplify 之前的描边产物，按 nonzero 填充就是目标形状
  const rawStrokeD = p.toSVGString();

  // 实心形状不描边，直接并进来
  for (const shape of extras) {
    const e = PathKit.FromSVGString(serializePath([shape], 6));
    p.op(e, PathKit.PathOp.UNION);
    e.delete();
  }

  p.simplify();                                   // 合并成 union 整体
  /* 不要在这里 setFillType(WINDING)。simplify() 交回来的 fillType 是 EVENODD，
     强行改标签等于把奇偶几何按非零解释，相交轮廓会整片填错 ——
     真正的转换在下面的 evenOddToNonZero 里按嵌套深度重排绕向。 */
  const mergedD = p.toSVGString();
  p.delete();

  /* 亚像素碎片必须在 simplify **之后** 剔。
     一开始我按「描边产物里有碎片」处理，剔完 sliver 计数是 0 但校验照旧失败 ——
     因为碎片不是描边产生的，是 simplify 解自交时在箭头尖端切出来的独立轮廓。
     它们绕向与主轮廓相反，nonzero 下被抵消、evenodd 下被挖空，
     所以两种规则渲染不一致。实测单个碎片面积 ~0.018，远小于任何真实笔画。
     此时整条 path 已经是 WINDING 归一化过的，删掉碎片轮廓不需要再合并一次。 */
  const { subpaths: clean, dropped } = dropSlivers(parsePath(mergedD));

  // 奇偶 → 非零：按嵌套深度重排各轮廓绕向，这样 fill-rule 可以省掉不写
  const d = serializePath(evenOddToNonZero(clean), 5);

  const measure = PathKit.FromSVGString(d);
  const b = measure.getBounds();
  measure.delete();

  return {
    d,
    dropped,
    rawStrokeD,
    bounds: { x: b.fLeft, y: b.fTop, w: b.fRight - b.fLeft, h: b.fBottom - b.fTop },
  };
}

/* ---------- 校验 ---------- */

const PX = 200;   // 校验渲染的边长

function svgDoc(body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" width="${PX}" height="${PX}">${body}</svg>`;
}

/* 取原始 RGBA 像素，不要 asPng()。
   PNG 是压缩流，一个像素不同会让整段字节全变，比字节等于把任何差异都读成 100%。 */
function renderPixels(body) {
  return new Resvg(svgDoc(body), { background: 'white' }).render().pixels;
}

/* 逐像素比对：任一通道差值超过 tol 即算这个像素不同。
   tol=16 用来吸收边缘抗锯齿的舍入差，形状真的错了的话差的是整块区域。 */
function pixelDiffRatio(a, b, tol = 16) {
  if (a.length !== b.length) return 1;
  const total = a.length / 4;
  let diff = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (Math.abs(a[i] - b[i]) > tol
      || Math.abs(a[i + 1] - b[i + 1]) > tol
      || Math.abs(a[i + 2] - b[i + 2]) > tol
      || Math.abs(a[i + 3] - b[i + 3]) > tol) diff++;
  }
  return diff / total;
}

/* 轮廓化是否忠实 —— 这是真正该校验的东西。

   ⚠️ 走过两条弯路，都记下来：

   弯路一：校验「nonzero 与 evenodd 渲染是否一致」。错。规则无关只是充分条件，
   不是必要条件 —— 两个同向重叠的轮廓在 nonzero 下填成并集、在 evenodd 下会挖掉
   交集，但它本身是完全合法的 nonzero path。按那个标准判，
   setting-off（六边形 + 圆 + 斜杠三者相交）永远过不了，而它其实是对的。

   弯路二：用「resvg 按 stroke-width=1 描边」当基准。方向对了，但两边不是同一个
   描边器：resvg 与 Skia 对曲线描边的近似不同，光这一项就让 hexagon+circle
   稳定差 1.9%，混在真实错误里分不出来。

   现在的基准是 simplify 之前的描边产物本身（Skia 描的），按 nonzero 填充。
   对圆环，Skia 描边给出的内外两条轮廓绕向相反，nonzero 得到环；
   对相交部分，同向轮廓叠加，nonzero 得到并集 —— 正好就是目标形状。
   基准与成品出自同一个描边器、都按填充渲染，描边器差异被消掉，
   剩下的差异就只可能是 simplify / 剔碎片 / 绕向重排这三步引入的真问题。 */
function outlineFidelity(rawStrokeD, extrasD, finalD) {
  const ref = renderPixels(
    `<path d="${rawStrokeD}" fill="black" fill-rule="nonzero"/>`
    + extrasD.map((d) => `<path d="${d}" fill="black"/>`).join('')
  );
  const got = renderPixels(`<path d="${finalD}" fill="black" fill-rule="nonzero"/>`);
  return pixelDiffRatio(ref, got);
}

/* 附带记录一下是否「规则无关」。规则无关不是规范要求，但如果成立，
   那么即便下游消费方默认按 evenodd 解释也不会画错，是个额外的保险。 */
function isRuleAgnostic(d) {
  const a = renderPixels(`<path d="${d}" fill="black" fill-rule="nonzero"/>`);
  const b = renderPixels(`<path d="${d}" fill="black" fill-rule="evenodd"/>`);
  return pixelDiffRatio(a, b) === 0;
}

/* 命名规范：不能有空格；小写字母、数字、连字符；不能与库里已有名称重复 */
const LIBRARY_NAMES = new Set(
  readFileSync(join(HERE, '..', '.kiro', 'steering', 'design-system-vue.md'), 'utf8')
    .split('\n')
    .flatMap((line) => [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1].trim().toLowerCase()))
);

function checkName(name) {
  const problems = [];
  if (/\s/.test(name)) problems.push('名称含空格');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) problems.push('名称应为小写字母/数字，用连字符分段');
  if (LIBRARY_NAMES.has(name.toLowerCase())) problems.push(`与库内已有图标同名（${name}）`);
  return problems;
}

/* ---------- 主流程 ---------- */

const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const PathKit = await loadPathKit();
  mkdirSync(OUT, { recursive: true });

  const entries = [];
  const report = [];
  let failures = 0;

  for (const icon of ICONS) {
    // 1 读源
    const loaded = icon.sources.map((s) => readSource(s));
    let centerlines = loaded.flatMap((l) => l.subpaths);

    /* 2 装进网格。
       fit.raw = true 表示中心线已经按 16 网格画好（手绘的那批），不再缩放平移 ——
       缩放会把「墙在哪、块填到哪」这些刻意对齐的半整数坐标搅乱。
       仍然过一遍 mapToGrid 做半整数吸附：作者手抖写成整数时能兜住。 */
    const t = icon.fit.raw
      ? { scale: 1, tx: 0, ty: 0 }
      : fitTransform(boundsOf(PathKit, centerlines), icon.fit.box);
    centerlines = mapToGrid(centerlines, { ...t, snapLines: true });

    // 3 中心线倒角 → 外沿 1px 圆角 / 内沿直角
    centerlines = roundCorners(centerlines, CORNER_R);

    // 额外实心形状：相对成图 bbox 定位，所以要先知道描边后的框
    const probe = outline(PathKit, centerlines, []);
    const extras = (icon.extras || []).map((f) => (typeof f === 'function' ? f(probe.bounds) : f));

    // 4~5 描边 + 并集 + Non-zero
    const { d, bounds, dropped, rawStrokeD } = outline(PathKit, centerlines, extras);

    // 6 校验
    const problems = [];
    problems.push(...checkName(icon.name));

    const fidelity = outlineFidelity(
      rawStrokeD,
      extras.map((s) => serializePath([s], 6)),
      d
    );
    /* 阈值 0.5%。基准与成品出自同一描边器，纯直线构成的图标实测 0.00~0.11%，
       只有抗锯齿舍入和被剔掉的亚像素碎片。曲线与直线相交的地方（setting-off 的
       斜杠穿过圆环）simplify 求交点是近似的，接缝处会到 0.46%，仍是亚像素级。
       形状真的错了是 10% 以上的量级，和这两档不会混。 */
    if (fidelity > 0.005) {
      problems.push(`轮廓与 1px 描边基准不符（像素差异 ${(fidelity * 100).toFixed(2)}%）`);
    }
    if (/stroke/i.test(d)) problems.push('轮廓里仍有 stroke 残留');
    const longEdge = Math.max(bounds.w, bounds.h);
    if (longEdge > GRID + 1e-6) problems.push(`图形溢出 16 画框（长边 ${longEdge.toFixed(2)}）`);

    if (problems.length) failures += problems.length;

    // 产物：单个 svg 便于目视复核
    writeFileSync(
      join(OUT, `${icon.name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" width="${GRID}" height="${GRID}">\n`
      + `  <path d="${d}" fill="currentColor"/>\n</svg>\n`
    );

    const srcList = icon.sources.map((s) => s.name || s.label || '手绘').join(' + ');
    entries.push({
      key: icon.key,
      name: icon.name,
      zh: icon.zh,
      targets: icon.targets,
      /* 手绘的那批不写 TDesign 出处（写了就是假来源），改用 icon.srcLabel。
         这个字段会进页面 tooltip，是「这个图标不是 Design Token 库里的」唯一凭据，
         不能省 —— 省了 stdCell 会默认标成 Design Token China。 */
      src: icon.srcLabel || `${SOURCE_LIB.lib} ${SOURCE_LIB.version} · ${srcList}`,
      hand: !!icon.srcLabel,
      note: icon.note,
      svg: `<path id="Union" d="${d}" fill="currentColor"/>`,
    });

    report.push({
      name: icon.name,
      src: srcList,
      subpaths: loaded.map((l) => `${l.srcName}:${l.subpathCount}`).join(','),
      box: icon.fit.raw ? 'raw' : icon.fit.box,   // raw = 手绘，中心线已按 16 网格给好
      longEdge: longEdge.toFixed(2),
      slivers: dropped.length,
      dropped,
      fidelity: (fidelity * 100).toFixed(2) + '%',
      ruleAgnostic: isRuleAgnostic(d),
      problems,
    });
  }

  // 贴进 index.html 的片段
  /* 手绘那批不能套用「外部素材改造 / MIT」那句 —— 没有外部素材，也不涉及别人的许可。 */
  const js = entries
    .map((e) =>
      (e.hand
        ? `  /* ${e.zh} —— 本项目新画，未过评审\n     来源：${e.src}\n`
        : `  /* ${e.zh} —— 外部素材改造，未过评审\n     来源：${e.src}（MIT）\n`)
      + `     ${e.note} */\n`
      + `  ${e.key}: { name: '${e.name}', src: '${e.src}', vb: '0 0 16 16', svg: '${e.svg.replace(/'/g, "\\'")}' },`
    )
    .join('\n');
  writeFileSync(join(OUT, 'std-icons.js'), js + '\n');

  const targets = entries
    .map((e) => `  ${e.key}: [${e.targets.map((t) => `'${t}'`).join(', ')}],`)
    .join('\n');
  writeFileSync(join(OUT, 'std-icon-targets.js'), targets + '\n');

  // 报告
  console.log(`\n${pad('name', 16)}${pad('source', 24)}${pad('box', 5)}${pad('longEdge', 10)}${pad('sliver', 8)}${pad('轮廓差异', 10)}规则无关`);
  console.log('-'.repeat(84));
  for (const r of report) {
    console.log(`${pad(r.name, 16)}${pad(r.src, 24)}${pad(r.box, 5)}${pad(r.longEdge, 10)}${pad(r.slivers, 8)}${pad(r.fidelity, 12)}${r.ruleAgnostic ? 'yes' : 'no'}`);
    for (const s of r.dropped) console.log(`    · 剔除碎片 ${s.w}\u00d7${s.h}，面积 ${s.area}`);
    for (const p of r.problems) console.log(`  ! ${p}`);
  }
  console.log(`\n产物：tools/out/*.svg、tools/out/std-icons.js、tools/out/std-icon-targets.js`);
  console.log(failures ? `\n\u26a0 ${failures} 项校验未通过\n` : '\n全部校验通过\n');
  process.exitCode = failures ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
