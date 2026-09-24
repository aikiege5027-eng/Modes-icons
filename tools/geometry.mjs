/* ============================================================
   几何工具：中心线 → 规范化轮廓
   服务于 icon 设计规范（Design Token China, node 7306:7236）的三条硬要求：
     · 16×16 网格，统一 1px 边线
     · 外边缘 1px 圆角，内边缘无弧度直角
     · 所有组成部分轮廓化后并成一个 union 整体，且必须是 Non-zero rule

   为什么是「中心线 + 1px 描边」而不是直接缩放外部素材：
     外部图库（TDesign）的图标画在 24 网格上、stroke-width=2。
     按 24→16 等比缩放（×2/3）线宽会变成 1.333px，达不到规范的 1px。
     线宽不是可缩放属性 —— 它要在目标网格上重新指定。
     所以这里只搬运「中心线几何」，线宽固定按 1 重新描边。

   为什么外圆角靠「中心线先倒 0.5 圆角」实现：
     1px 墙体的外沿半径 = 中心线半径 + 0.5，内沿半径 = 中心线半径 − 0.5。
     取中心线半径 0.5，外沿正好 1px 圆角、内沿正好 0（直角），与规范逐字一致。
     这也与库里 elevator-door-closed（612:959）的画法吻合：
     外角 r=1（cubic 控制点 0.4477 = 1−0.5523），内角 V1 H4.5 全是直角。
   ============================================================ */

import svgpath from 'svgpath';

/* 圆弧的三次贝塞尔近似系数。库里的 path 用的就是这个数
   （0.447715 = 1 − 0.552285），所以这里保持一致，不用别的近似。 */
export const KAPPA = 0.5522847498307936;

/* ---------- 路径解析 ---------- */

/* 把任意 d 解析成 subpath 列表。
   先用 svgpath 归一化成绝对坐标、展开圆弧与简写命令，
   再把 H/V 拍成 L、Q 升成 C，之后下游只需处理 M/L/C/Z 四种。 */
export function parsePath(d) {
  const subpaths = [];
  let cur = null;
  let px = 0, py = 0;      // 当前点
  let sx = 0, sy = 0;      // 当前 subpath 起点

  svgpath(d).abs().unarc().unshort().iterate((seg) => {
    const cmd = seg[0];

    if (cmd === 'M') {
      px = sx = seg[1]; py = sy = seg[2];
      cur = { start: { x: px, y: py }, segs: [], closed: false };
      subpaths.push(cur);
      return;
    }
    if (!cur) return;

    switch (cmd) {
      case 'L':
        cur.segs.push({ type: 'L', x: seg[1], y: seg[2] });
        px = seg[1]; py = seg[2];
        break;
      case 'H':
        cur.segs.push({ type: 'L', x: seg[1], y: py });
        px = seg[1];
        break;
      case 'V':
        cur.segs.push({ type: 'L', x: px, y: seg[1] });
        py = seg[1];
        break;
      case 'C':
        cur.segs.push({ type: 'C', x1: seg[1], y1: seg[2], x2: seg[3], y2: seg[4], x: seg[5], y: seg[6] });
        px = seg[5]; py = seg[6];
        break;
      case 'Q': {
        // 二次升三次：控制点各取 1/3、2/3
        const x1 = px + (2 / 3) * (seg[1] - px);
        const y1 = py + (2 / 3) * (seg[2] - py);
        const x2 = seg[3] + (2 / 3) * (seg[1] - seg[3]);
        const y2 = seg[4] + (2 / 3) * (seg[2] - seg[4]);
        cur.segs.push({ type: 'C', x1, y1, x2, y2, x: seg[3], y: seg[4] });
        px = seg[3]; py = seg[4];
        break;
      }
      case 'Z':
        cur.closed = true;
        px = sx; py = sy;
        break;
      default:
        throw new Error(`parsePath: 未处理的命令 ${cmd}`);
    }
  });

  // 丢掉只有一个 M、没有任何线段的空 subpath
  return subpaths.filter((s) => s.segs.length > 0);
}

export function serializePath(subpaths, precision = 4) {
  const n = (v) => {
    const r = Number(v.toFixed(precision));
    return Object.is(r, -0) ? 0 : r;
  };
  return subpaths
    .map((sp) => {
      let out = `M${n(sp.start.x)} ${n(sp.start.y)}`;
      for (const s of sp.segs) {
        out += s.type === 'L'
          ? `L${n(s.x)} ${n(s.y)}`
          : `C${n(s.x1)} ${n(s.y1)} ${n(s.x2)} ${n(s.y2)} ${n(s.x)} ${n(s.y)}`;
      }
      if (sp.closed) out += 'Z';
      return out;
    })
    .join('');
}

/* ---------- 网格映射 ---------- */

/* 24 网格 → 16 网格。
   snapLines=true 时把直线端点吸附到半整数（n+0.5）：
   1px 描边以中心线为轴，中心线落在半整数上，两条边沿才正好压在整数像素边界，
   16px 展示时不发虚。曲线的控制点不吸附 —— 吸附会把圆弧拉歪，
   而曲线边缘本来就靠抗锯齿呈现，压不压像素格无感。 */
export function mapToGrid(subpaths, { scale = 1, tx = 0, ty = 0, snapLines = true } = {}) {
  const half = (v) => Math.round(v - 0.5) + 0.5;
  const T = (v, off) => v * scale + off;

  return subpaths.map((sp) => {
    const isLineNode = new Set();
    if (snapLines) {
      // 起点只有在第一段是直线时才算「直线端点」
      if (sp.segs[0].type === 'L') isLineNode.add(-1);
      sp.segs.forEach((s, i) => { if (s.type === 'L') isLineNode.add(i); });
    }

    const mapPt = (x, y, snap) => ({
      x: snap ? half(T(x, tx)) : T(x, tx),
      y: snap ? half(T(y, ty)) : T(y, ty),
    });

    const start = mapPt(sp.start.x, sp.start.y, isLineNode.has(-1));
    const segs = sp.segs.map((s, i) => {
      if (s.type === 'L') {
        const p = mapPt(s.x, s.y, isLineNode.has(i));
        return { type: 'L', x: p.x, y: p.y };
      }
      return {
        type: 'C',
        x1: T(s.x1, tx), y1: T(s.y1, ty),
        x2: T(s.x2, tx), y2: T(s.y2, ty),
        x: T(s.x, tx), y: T(s.y, ty),
      };
    });

    return { start, segs, closed: sp.closed };
  });
}

/* ---------- 中心线倒角 ---------- */

/* 给「直线—直线」拐角倒 r 圆角（默认 0.5）。
   只处理两侧都是直线的拐角：曲线相接处本来就是光滑过渡，不需要也不该动。
   共线（夹角≈180°）的点跳过，避免插入退化弧。
   r 会被两侧线段长度的一半夹住，短边不会被倒角吃穿。 */
export function roundCorners(subpaths, r = 0.5) {
  return subpaths.map((sp) => {
    // 展开成顶点环 / 链，便于按三元组处理
    const pts = [sp.start, ...sp.segs.map((s) => ({ x: s.x, y: s.y }))];
    const segsIn = sp.segs.slice();

    /* 闭合路径里，最后一点若与起点重合，说明最后一段显式回到了起点，
       Z 只是补一个零长度闭合。此时去掉重复的**点**，但绝不能连那一段一起去掉 ——
       那一段是真实存在的几何。

       ⚠️ 这里踩过一个坑：一开始点和段一起 pop 掉，然后统一补一条「Z 隐含的直线」。
       对矩形无所谓（本来就是直线），但对圆就是灾难：圆的第四段是回到起点的
       **曲线**，被 pop 掉再换成直线，圆就变成「三段弧 + 一条弦」，
       不仅缺一块，弦还与弧自交，描边后两个同心轮廓绕向错乱，
       nonzero 下整个圆填成实心饼。setting-off 那个黑饼就是这么来的。 */
    if (sp.closed && pts.length > 1) {
      const a = pts[0], b = pts[pts.length - 1];
      if (Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9) pts.pop();
    }

    const n = pts.length;
    if (n < 3) return sp;

    /* segList[i] = 从 pts[i] 到 pts[(i+1)%n] 的那一段。
       闭合且段数已等于点数时，收尾段就在 segsIn 里（上面只删了重复点）；
       段数少一条时，说明收尾靠 Z 隐含的直线，这里补上。 */
    const segList = segsIn.slice();
    if (sp.closed && segList.length === n - 1) {
      segList.push({ type: 'L', x: pts[0].x, y: pts[0].y });
    }
    if (segList.length !== (sp.closed ? n : n - 1)) {
      throw new Error(`roundCorners: 段数与点数不匹配（点 ${n}、段 ${segList.length}、closed=${sp.closed}）`);
    }

    const len = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const unit = (a, b) => {
      const d = len(a, b);
      return d < 1e-9 ? { x: 0, y: 0 } : { x: (b.x - a.x) / d, y: (b.y - a.y) / d };
    };

    /* 顶点 i 的入段 = segList[i-1]，出段 = segList[i]。
       闭合时下标环绕；开放时首尾顶点没有完整的入/出段，不倒角。 */
    const typeOf = (k) => (segList[k] ? segList[k].type : null);
    const inType = (i) => (i === 0 ? (sp.closed ? typeOf(n - 1) : null) : typeOf(i - 1));
    const outType = (i) => (i === n - 1 && !sp.closed ? null : typeOf(i % n));

    const corner = [];   // corner[i] = {p1, c1, c2, p2} 或 null
    for (let i = 0; i < n; i++) {
      if (inType(i) !== 'L' || outType(i) !== 'L') { corner.push(null); continue; }

      const prev = pts[(i - 1 + n) % n];
      const V = pts[i];
      const next = pts[(i + 1) % n];

      const d1 = unit(prev, V);   // 入方向
      const d2 = unit(V, next);   // 出方向
      const cross = d1.x * d2.y - d1.y * d2.x;
      const dot = d1.x * d2.x + d1.y * d2.y;
      if (Math.abs(cross) < 1e-9) { corner.push(null); continue; }   // 共线
      if (dot < -0.999) { corner.push(null); continue; }             // 折返，倒角无意义

      const rr = Math.min(r, len(prev, V) / 2, len(V, next) / 2);
      if (rr < 1e-6) { corner.push(null); continue; }

      const p1 = { x: V.x - d1.x * rr, y: V.y - d1.y * rr };
      const p2 = { x: V.x + d2.x * rr, y: V.y + d2.y * rr };
      corner.push({
        p1,
        c1: { x: p1.x + d1.x * rr * KAPPA, y: p1.y + d1.y * rr * KAPPA },
        c2: { x: p2.x - d2.x * rr * KAPPA, y: p2.y - d2.y * rr * KAPPA },
        p2,
      });
    }

    /* 重建：顶点 i 若倒角，则「到 i 的直线」终点改成 p1，随后插入弧到 p2。 */
    const out = [];
    const startNode = corner[0] ? corner[0].p2 : pts[0];
    let newStart = startNode;

    for (let k = 0; k < (sp.closed ? n : n - 1); k++) {
      const i = k;                       // 段 i：pts[i] → pts[i+1]
      const j = (i + 1) % n;
      const seg = segList[i];

      if (seg.type === 'C') {
        out.push({ ...seg });
        continue;
      }
      // 直线段：终点可能被下一个拐角提前截断
      const end = corner[j] ? corner[j].p1 : pts[j];
      out.push({ type: 'L', x: end.x, y: end.y });
      if (corner[j]) {
        const c = corner[j];
        out.push({ type: 'C', x1: c.c1.x, y1: c.c1.y, x2: c.c2.x, y2: c.c2.y, x: c.p2.x, y: c.p2.y });
      }
    }

    if (!sp.closed) newStart = pts[0];

    return { start: newStart, segs: out, closed: sp.closed };
  });
}

/* ---------- 基本形状（16 网格，直接给最终几何） ---------- */

/* 实心圆：用四段三次贝塞尔，与库里画圆的方式一致 */
export function circle(cx, cy, r) {
  const k = r * KAPPA;
  return {
    start: { x: cx + r, y: cy },
    segs: [
      { type: 'C', x1: cx + r, y1: cy + k, x2: cx + k, y2: cy + r, x: cx, y: cy + r },
      { type: 'C', x1: cx - k, y1: cy + r, x2: cx - r, y2: cy + k, x: cx - r, y: cy },
      { type: 'C', x1: cx - r, y1: cy - k, x2: cx - k, y2: cy - r, x: cx, y: cy - r },
      { type: 'C', x1: cx + k, y1: cy - r, x2: cx + r, y2: cy - k, x: cx + r, y: cy },
    ],
    closed: true,
  };
}

/* 轴对齐矩形 */
export function rect(x, y, w, h) {
  return {
    start: { x, y },
    segs: [
      { type: 'L', x: x + w, y },
      { type: 'L', x: x + w, y: y + h },
      { type: 'L', x, y: y + h },
    ],
    closed: true,
  };
}

/* ---------- 退化子路径清理 ---------- */

/* 锐角拐角在 1px 描边 + MITER 连接下会甩出亚像素碎片（实测 relevel 的箭头尖端
   甩出两个 0.23×0.16 的三角）。这些碎片压在主图形上，nonzero 会填实、evenodd
   会挖空，于是同一条 path 两种规则渲染不一致 —— 正是 Non-zero 校验失败的原因。

   阈值按「一个像素的墨量」定：统一线宽是 1，所以最短的有意义笔画
   （长 1px、宽 1px）面积约等于 1，设计上可能存在的最小镂空也是 1×1=1。
   取 minArea=0.4、minExtent=0.8 —— 不到半个像素的东西一律当碎片，
   真实笔画与真实镂空都在阈值之上，不会被误伤。
   剔掉的东西会在构建报告里逐条列出尺寸与面积，便于复核有没有误删。 */
export function dropSlivers(subpaths, { minExtent = 0.8, minArea = 0.4 } = {}) {
  const kept = [];
  const dropped = [];

  for (const sp of subpaths) {
    // 采样成折线：曲线按端点与控制点一起进包围盒，够用且偏保守
    const xs = [sp.start.x];
    const ys = [sp.start.y];
    const poly = [{ x: sp.start.x, y: sp.start.y }];
    for (const s of sp.segs) {
      if (s.type === 'C') {
        xs.push(s.x1, s.x2, s.x); ys.push(s.y1, s.y2, s.y);
      } else {
        xs.push(s.x); ys.push(s.y);
      }
      poly.push({ x: s.x, y: s.y });
    }

    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);

    // 鞋带公式算有向面积
    let a2 = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length];
      a2 += p.x * q.y - q.x * p.y;
    }
    const area = Math.abs(a2) / 2;

    if (Math.max(w, h) < minExtent || area < minArea) {
      dropped.push({ w: +w.toFixed(3), h: +h.toFixed(3), area: +area.toFixed(4) });
    } else {
      kept.push(sp);
    }
  }

  return { subpaths: kept, dropped };
}

/* ---------- 奇偶规则 → 非零规则 ---------- */

/* 把一条 subpath 采样成折线，用于包含判断与朝向计算。
   曲线按固定份数细分，精度对「点在不在里面」「绕向是正还是负」这两件事足够。 */
function flatten(sp, steps = 16) {
  const pts = [{ x: sp.start.x, y: sp.start.y }];
  let cx = sp.start.x, cy = sp.start.y;
  for (const s of sp.segs) {
    if (s.type === 'L') {
      pts.push({ x: s.x, y: s.y });
    } else {
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        pts.push({
          x: u * u * u * cx + 3 * u * u * t * s.x1 + 3 * u * t * t * s.x2 + t * t * t * s.x,
          y: u * u * u * cy + 3 * u * u * t * s.y1 + 3 * u * t * t * s.y2 + t * t * t * s.y,
        });
      }
    }
    cx = s.x; cy = s.y;
  }
  return pts;
}

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/* 奇偶规则的点包含判断（射线法） */
function contains(pts, pt) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.y > pt.y) !== (b.y > pt.y)
      && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/* 判断嵌套深度用的探测点：取该轮廓最长一条边的中点，即轮廓**线上**的一点。

   ⚠️ 这里不能用「轮廓内部的点」。踩过一次：圆环的外轮廓单独看是一个大圈，
   它的「内部」把中间的孔也算进去了，于是在孔里取到点，一测发现落在内轮廓里，
   外轮廓被判成深度 1（镂空）并反向，整个环填反。
   轮廓之间互不穿越时，轮廓上的任一点相对其他轮廓要么全在内要么全在外，
   拿线上的点判包含才是对的。 */
function probePoint(pts) {
  let best = null, bestLen = -1;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    if (l > bestLen) { bestLen = l; best = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
  }
  return bestLen > 1e-9 ? best : null;
}

/* 反转一条 subpath 的方向（三次贝塞尔反转时两个控制点要对调） */
function reverseSubpath(sp) {
  const pts = [sp.start, ...sp.segs.map((s) => ({ x: s.x, y: s.y }))];
  const n = sp.segs.length;
  const segs = [];
  for (let i = n - 1; i >= 0; i--) {
    const s = sp.segs[i];
    const from = pts[i];
    segs.push(s.type === 'L'
      ? { type: 'L', x: from.x, y: from.y }
      : { type: 'C', x1: s.x2, y1: s.y2, x2: s.x1, y2: s.y1, x: from.x, y: from.y });
  }
  return { start: { x: pts[n].x, y: pts[n].y }, segs, closed: sp.closed };
}

/* 把「按奇偶规则画才对」的路径改写成「按非零规则画也对」。

   这是规范里那条要求的程序化实现：
     「有些导出格式（TrueType 字体、Android 矢量图）只能用非零规则，
       这个插件可以把奇偶规则改成非零规则」
   插件的做法是手动点轮廓改方向，这里按嵌套深度自动定方向：
     深度为偶数的轮廓是实体，取统一朝向；深度为奇数的是镂空，取反向。
     非零规则下，一层实体 +1、里面的镂空 −1，叠加为 0 → 镂空；
     再里面一层又回到 +1 → 实体。与奇偶规则的结果逐层等价。

   前提是轮廓之间互不穿越（只能是分离或嵌套）—— simplify() 已经解掉了所有交点，
   输出满足这个前提，所以这一步在此处是可靠的。

   ⚠️ 为什么必须做这一步：PathKit 的 simplify() 返回的路径 fillType 是 EVENODD。
   直接 setFillType(WINDING) 等于把奇偶几何按非零去解释 —— 单个圆环碰巧一致，
   但一旦出现相交轮廓（斜杠穿过六边形环）就会整片填错。
   setting-off 之前那半边黑就是这个原因。 */
export function evenOddToNonZero(subpaths) {
  const flat = subpaths.map((sp) => flatten(sp));
  const probes = flat.map((pts) => probePoint(pts));

  return subpaths.map((sp, i) => {
    const pt = probes[i];
    if (!pt) return sp;   // 退化轮廓，原样放过

    let depth = 0;
    for (let j = 0; j < flat.length; j++) {
      if (j !== i && contains(flat[j], pt)) depth++;
    }

    const area = signedArea(flat[i]);
    const wantPositive = depth % 2 === 0;
    const isPositive = area > 0;
    return wantPositive === isPositive ? sp : reverseSubpath(sp);
  });
}
