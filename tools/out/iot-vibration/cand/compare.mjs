// One-off comparison helper: decide which svgAsset matches what is on the Figma canvas.
// Rasterizes each candidate SVG with @resvg/resvg-js, extracts the icon region from the
// 4x cell PNG, normalizes both to a 64x64 ink mask and reports IoU for identity plus
// rotated / mirrored variants (to catch node-transform mismatches).
import { readFileSync, writeFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { Resvg } from '/Users/meijuan.ge/Documents/KiroProjects/Modes-icons/tools/node_modules/@resvg/resvg-js/index.js'

function decodePng(buf) {
  let p = 8
  let w = 0, h = 0, bitDepth = 0, colorType = 0
  const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p)
    const type = buf.toString('ascii', p + 4, p + 8)
    const data = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
      if (data[12] !== 0) throw new Error('interlaced png not supported')
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    p += 12 + len
  }
  if (bitDepth !== 8) throw new Error('bit depth ' + bitDepth)
  const ch = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : null
  if (!ch) throw new Error('color type ' + colorType)
  const raw = inflateSync(Buffer.concat(idat))
  const stride = w * ch
  const out = Buffer.alloc(w * h * 4)
  let prev = Buffer.alloc(stride)
  let off = 0
  for (let y = 0; y < h; y++) {
    const ft = raw[off++]
    const line = Buffer.from(raw.subarray(off, off + stride))
    off += stride
    for (let i = 0; i < stride; i++) {
      const a = i >= ch ? line[i - ch] : 0
      const b = prev[i]
      const c = i >= ch ? prev[i - ch] : 0
      let v = line[i]
      if (ft === 1) v += a
      else if (ft === 2) v += b
      else if (ft === 3) v += (a + b) >> 1
      else if (ft === 4) {
        const pp = a + b - c
        const pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      line[i] = v & 0xff
    }
    for (let x = 0; x < w; x++) {
      const s = x * ch
      const d = (y * w + x) * 4
      if (ch === 1) { out[d] = out[d + 1] = out[d + 2] = line[s]; out[d + 3] = 255 }
      else { out[d] = line[s]; out[d + 1] = line[s + 1]; out[d + 2] = line[s + 2]; out[d + 3] = ch === 4 ? line[s + 3] : 255 }
    }
    prev = line
  }
  return { w, h, rgba: out }
}

// ink = pixel that is neither transparent nor near-white
function toMask({ w, h, rgba }, x0 = 0, y0 = 0, cw = w, chh = h) {
  const m = new Uint8Array(cw * chh)
  for (let y = 0; y < chh; y++) {
    for (let x = 0; x < cw; x++) {
      const d = ((y + y0) * w + (x + x0)) * 4
      const a = rgba[d + 3]
      const lum = (rgba[d] + rgba[d + 1] + rgba[d + 2]) / 3
      m[y * cw + x] = a > 40 && lum < 225 ? 1 : 0
    }
  }
  return { m, w: cw, h: chh }
}

function bbox({ m, w, h }) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

const N = 64
function normalize(mask) {
  const b = bbox(mask)
  const out = new Uint8Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // box-sample source cell
    const sx0 = b.x0 + Math.floor((x * b.w) / N), sx1 = b.x0 + Math.max(Math.floor(((x + 1) * b.w) / N), Math.floor((x * b.w) / N) + 1)
    const sy0 = b.y0 + Math.floor((y * b.h) / N), sy1 = b.y0 + Math.max(Math.floor(((y + 1) * b.h) / N), Math.floor((y * b.h) / N) + 1)
    let on = 0, tot = 0
    for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { tot++; on += mask.m[sy * mask.w + sx] }
    out[y * N + x] = tot && on / tot > 0.4 ? 1 : 0
  }
  return { grid: out, aspect: b.w / b.h, bbox: b }
}

function iou(a, b) {
  let i = 0, u = 0
  for (let k = 0; k < N * N; k++) { const x = a[k], y = b[k]; if (x || y) u++; if (x && y) i++ }
  return u ? i / u : 0
}
const rot90 = g => { const o = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) o[x * N + (N - 1 - y)] = g[y * N + x]; return o }
const flipX = g => { const o = new Uint8Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) o[y * N + (N - 1 - x)] = g[y * N + x]; return o }

function renderSvg(file) {
  const svg = readFileSync(file, 'utf8')
  const r = new Resvg(svg, { fitTo: { mode: 'height', value: 240 }, background: 'white' })
  return decodePng(Buffer.from(r.render().asPng()))
}

const [, , cellPng, cropSpec, ...svgs] = process.argv
const [cx, cy, cw, chh] = cropSpec.split(',').map(Number)
const cell = decodePng(readFileSync(cellPng))
console.log('cell png', cell.w + 'x' + cell.h, 'crop', cropSpec)
const target = normalize(toMask(cell, cx, cy, cw, chh))
console.log('canvas ink bbox', JSON.stringify(target.bbox), 'aspect', target.aspect.toFixed(3))
// dump the crop mask as ascii for eyeball check
const dump = g => { let s = ''; for (let y = 0; y < N; y += 2) { for (let x = 0; x < N; x += 1) s += g[y * N + x] ? '#' : '.'; s += '\n' } return s }
writeFileSync(cellPng.replace(/\.png$/, '.mask.txt'), dump(target.grid))

const rows = []
for (const f of svgs) {
  const img = renderSvg(f)
  const n = normalize(toMask(img))
  const variants = { id: n.grid }
  variants.r90 = rot90(n.grid); variants.r180 = rot90(variants.r90); variants.r270 = rot90(variants.r180)
  variants.mx = flipX(n.grid); variants.my = flipX(variants.r180)
  const scored = Object.entries(variants).map(([k, g]) => [k, iou(g, target.grid)]).sort((a, b) => b[1] - a[1])
  rows.push({ file: f, aspect: +n.aspect.toFixed(3), identityIoU: +iou(n.grid, target.grid).toFixed(4), best: scored[0][0], bestIoU: +scored[0][1].toFixed(4) })
  writeFileSync(f.replace(/\.svg$/, '.mask.txt'), dump(n.grid))
}
rows.sort((a, b) => b.identityIoU - a.identityIoU)
console.table(rows)
