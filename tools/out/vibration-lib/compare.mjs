// Ad-hoc orientation checker for the vibration icon family.
// Rasterizes the exported SVG with resvg and decodes the Figma canvas render PNG,
// then prints both as ASCII grids so rotation / mirroring can be compared.
import { readFileSync, readdirSync } from 'node:fs'
import zlib from 'node:zlib'
import { createRequire } from 'node:module'

const require = createRequire('/Users/meijuan.ge/Documents/KiroProjects/Modes-icons/tools/')
const { Resvg } = require('@resvg/resvg-js')

const DIR = '/Users/meijuan.ge/Documents/KiroProjects/Modes-icons/tools/out/vibration-lib'

// ---- minimal PNG decoder (non-interlaced, 8-bit, RGB/RGBA/grey) ----
function decodePng(buf) {
  let off = 8
  let w = 0, h = 0, colorType = 0, bitDepth = 0
  const idat = []
  let palette = null, trns = null
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4)
      bitDepth = data[8]; colorType = data[9]
      if (data[12] !== 0) throw new Error('interlaced PNG not supported')
      if (bitDepth !== 8) throw new Error('bitDepth ' + bitDepth + ' not supported')
    } else if (type === 'PLTE') palette = Buffer.from(data)
    else if (type === 'tRNS') trns = Buffer.from(data)
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error('colorType ' + colorType + ' not supported')
  const bpp = channels
  const stride = w * bpp
  const out = Buffer.alloc(h * stride)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0
      const b = prev[x]
      const c = x >= bpp ? prev[x - bpp] : 0
      let v = line[x]
      switch (filter) {
        case 0: break
        case 1: v += a; break
        case 2: v += b; break
        case 3: v += (a + b) >> 1; break
        case 4: {
          const p = a + b - c
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c)
          v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)
          break
        }
        default: throw new Error('filter ' + filter)
      }
      cur[x] = v & 0xff
    }
    cur.copy(out, y * stride)
    prev = cur
  }
  // coverage = how "inked" each pixel is (alpha, or darkness on white)
  const cov = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a
    if (colorType === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3] }
    else if (colorType === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; a = 255 }
    else if (colorType === 0) { r = g = b = out[i]; a = 255 }
    else if (colorType === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1] }
    else { // palette
      const idx = out[i]
      r = palette[idx * 3]; g = palette[idx * 3 + 1]; b = palette[idx * 3 + 2]
      a = trns && idx < trns.length ? trns[idx] : 255
    }
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    cov[i] = (a / 255) * (1 - lum)
  }
  return { w, h, cov }
}

const RAMP = ' .:-=+*#%@'
function ascii({ w, h, cov }, cols = 32) {
  const rows = Math.round(cols * h / w)
  let s = ''
  for (let ry = 0; ry < rows; ry++) {
    for (let rx = 0; rx < cols; rx++) {
      const x0 = Math.floor(rx * w / cols), x1 = Math.max(x0 + 1, Math.floor((rx + 1) * w / cols))
      const y0 = Math.floor(ry * h / rows), y1 = Math.max(y0 + 1, Math.floor((ry + 1) * h / rows))
      let sum = 0, n = 0
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { sum += cov[y * w + x]; n++ }
      const v = sum / n
      s += RAMP[Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1)))]
    }
    s += '\n'
  }
  return s
}

function bbox({ w, h, cov }, t = 0.08) {
  let minx = w, miny = h, maxx = -1, maxy = -1
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (cov[y * w + x] > t) {
      if (x < minx) minx = x; if (x > maxx) maxx = x
      if (y < miny) miny = y; if (y > maxy) maxy = y
    }
  }
  return { minx, miny, maxx, maxy }
}

// quadrant ink signature: helps detect mirror / rotation
function quadrants({ w, h, cov }) {
  const q = [0, 0, 0, 0]
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y < h / 2 ? 0 : 2) + (x < w / 2 ? 0 : 1)
    q[i] += cov[y * w + x]
  }
  const tot = q.reduce((a, b) => a + b, 0) || 1
  return q.map(v => (v / tot * 100).toFixed(1))
}

const names = readdirSync(DIR).filter(f => f.endsWith('.svg')).map(f => f.replace(/\.svg$/, ''))
for (const name of names) {
  const svg = readFileSync(`${DIR}/${name}.svg`, 'utf8')
  const r = new Resvg(svg, { fitTo: { mode: 'width', value: 256 }, background: 'white' })
  const svgPix = decodePng(Buffer.from(r.render().asPng()))
  const renderPix = decodePng(readFileSync(`${DIR}/${name}_render.png`))
  const exportPix = decodePng(readFileSync(`${DIR}/${name}_export.png`))

  console.log('='.repeat(72))
  console.log(name)
  console.log(`svg root: ${/width="([^"]+)"/.exec(svg)[1]} x ${/height="([^"]+)"/.exec(svg)[1]}  viewBox="${/viewBox="([^"]+)"/.exec(svg)[1]}"`)
  console.log(`render png: ${renderPix.w}x${renderPix.h}   export png: ${exportPix.w}x${exportPix.h}`)
  console.log(`quadrant ink %  svg=[${quadrants(svgPix)}]  render=[${quadrants(renderPix)}]  export=[${quadrants(exportPix)}]`)
  // --- transform fit test: normalize both to a common grid via content bbox, then
  // score identity / mirrorX / mirrorY / rot180 / rot90 to detect node-level transforms.
  const N = 24
  const A = normalize(svgPix, N)
  const B = normalize(renderPix, N)
  const variants = {
    none: (x, y) => [x, y],
    mirrorX: (x, y) => [N - 1 - x, y],
    mirrorY: (x, y) => [x, N - 1 - y],
    rot180: (x, y) => [N - 1 - x, N - 1 - y],
    rot90cw: (x, y) => [N - 1 - y, x],
    rot90ccw: (x, y) => [y, N - 1 - x],
  }
  const scores = {}
  for (const [k, f] of Object.entries(variants)) {
    let err = 0
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const [tx, ty] = f(x, y)
      err += Math.abs(A[ty * N + tx] - B[y * N + x])
    }
    scores[k] = (err / (N * N)).toFixed(4)
  }
  console.log('fit error (lower = better match of SVG->render):', JSON.stringify(scores))

  console.log('--- SVG export (rasterized) ---')
  console.log(ascii(svgPix, 34))
  console.log('--- Figma canvas render (16px upscaled) ---')
  console.log(ascii(renderPix, 34))
}

// crop to content bbox and resample to NxN
function normalize(pix, N) {
  const { minx, miny, maxx, maxy } = bbox(pix)
  const bw = maxx - minx + 1, bh = maxy - miny + 1
  const out = new Float32Array(N * N)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const sx0 = minx + Math.floor(x * bw / N), sx1 = Math.max(sx0 + 1, minx + Math.floor((x + 1) * bw / N))
    const sy0 = miny + Math.floor(y * bh / N), sy1 = Math.max(sy0 + 1, miny + Math.floor((y + 1) * bh / N))
    let s = 0, n = 0
    for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) { s += pix.cov[sy * pix.w + sx]; n++ }
    out[y * N + x] = s / n
  }
  // normalize contrast
  let mx = 0
  for (const v of out) if (v > mx) mx = v
  if (mx > 0) for (let i = 0; i < out.length; i++) out[i] /= mx
  return out
}
