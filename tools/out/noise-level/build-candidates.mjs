/* 只构建 HANDRAIL_CANDIDATES 里的候选，不动 ICONS ——
   normalize-icon.mjs 跑的是 ICONS（产物要贴进 STD_ICONS），候选不能混进去（见配置里那段注释）。
   这里把 normalize-icon 的流水线按同样的参数复用一遍：
     中心线 → 倒角 r=0.5 → PathKit 以 width=1 / MITER / BUTT 描边 → union → Non-zero
   然后把每个候选写成 tools/out/<name>.svg，交给 render-candidates.mjs 出对照图。
   用法：cd tools/out/noise-level && node build-candidates.mjs handrail-lv1 handrail-lv2 … */
import { writeFileSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parsePath, serializePath, roundCorners, dropSlivers, evenOddToNonZero } from '../../geometry.mjs';
import { HANDRAIL_CANDIDATES } from '../../icons.config.mjs';

const require = createRequire(new URL('../../package.json', import.meta.url));
const init = require('pathkit-wasm/bin/pathkit.js');
const wasmBinary = readFileSync(require.resolve('pathkit-wasm/bin/pathkit.wasm'));
const PathKit = await init({ wasmBinary });

const want = process.argv.slice(2);
const list = want.length
  ? HANDRAIL_CANDIDATES.filter((c) => want.includes(c.name))
  : HANDRAIL_CANDIDATES;

for (const icon of list) {
  const centerlines = roundCorners(parsePath(icon.sources[0].centerlines), 0.5);
  const p = PathKit.FromSVGString(serializePath(centerlines, 6));
  p.stroke({
    width: 1,
    join: PathKit.StrokeJoin.MITER,
    cap: PathKit.StrokeCap.BUTT,
    miter_limit: 2,
  });
  for (const f of icon.extras || []) {
    const shape = typeof f === 'function' ? f({ x: 0, y: 0, w: 16, h: 16 }) : f;
    const e = PathKit.FromSVGString(serializePath([shape], 6));
    p.op(e, PathKit.PathOp.UNION);
    e.delete();
  }
  p.simplify();
  /* ⚠️ 这里不能 setFillType(WINDING) 就完事 —— simplify() 交回来的是 EVENODD 几何，
     只改标签等于把奇偶几何按非零解释，闭合轮廓的内孔会被整片填掉
     （第一版就是这么把「手的轮廓」渲成了一块实心）。真正的转换是下面按嵌套深度重排绕向。 */
  const mergedD = p.toSVGString();
  p.delete();
  const { subpaths: clean } = dropSlivers(parsePath(mergedD));
  const d = serializePath(evenOddToNonZero(clean), 5);
  const measure = PathKit.FromSVGString(d);
  const b = measure.getBounds();
  measure.delete();
  writeFileSync(new URL('../' + icon.name + '.svg', import.meta.url),
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="${d}" fill="currentColor"/></svg>\n`);
  console.log(icon.name.padEnd(16)
    + ' bbox ' + [b.fLeft, b.fTop, b.fRight, b.fBottom].map((n) => n.toFixed(2)).join(' ')
    + '  长边 ' + Math.max(b.fRight - b.fLeft, b.fBottom - b.fTop).toFixed(2));
}

/* 附：跑一遍 normalize-icon 里那条「Non-zero 安全」校验 ——
   判定不是看属性，是把同一条 path 分别按 nonzero 与 evenodd 渲成 PNG 逐字节比对，
   两者一致才说明 path 不依赖 fill-rule（这样贴进页面时可以省掉 fill-rule 不写）。
   用法：node build-candidates.mjs --check handrail-lv */
if (process.argv.includes('--check')) {
  const { Resvg } = require('@resvg/resvg-js');
  for (const icon of list) {
    const svg = readFileSync(new URL('../' + icon.name + '.svg', import.meta.url), 'utf8');
    const d = (svg.match(/ d="([^"]*)"/) || [])[1];
    const png = (rule) => new Resvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 16 16">`
      + `<path d="${d}" fill="#141414" fill-rule="${rule}"/></svg>`, {},
    ).render().asPng();
    const a = png('nonzero'); const b = png('evenodd');
    console.log(icon.name.padEnd(16) + ' Non-zero 安全 ' + (a.equals(b) ? 'yes' : 'NO ← 依赖 fill-rule，不能这样贴进页面'));
  }
}

process.exit(0);
