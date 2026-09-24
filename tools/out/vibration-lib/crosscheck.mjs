// Cross-checks: render vs export pixel equality, and mirror/rotation relations
// between the four vibration icons (pairwise, on the 16px canvas renders).
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'

const DIR = '/Users/meijuan.ge/Documents/KiroProjects/Modes-icons/tools/out/vibration-lib'
const NAMES = ['vibration-Horizonta', 'vibration-Horizonta2', 'vibration-vertical', 'vibration-vertical2']

function decodePng(buf) {
  let off = 8, w = 0, h = 0, colorType = 0
  const idat = []
  while (off < buf.length) {
    const len = buf.readUInt32BE(off)
    const type = buf.toString('ascii', off + 4, off + 8)
    const data = buf.subarray(off + 8, off + 8 + len)
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); colorType = data[9] }
    else if (type === 'IDAT') idat.push(Buffer.from(data))
    else if (type === 'IEND') break
    off += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[colorType]
  const stride = w * ch
  const out = Buffer.alloc(h * stride)
  let prev = Buffer.alloc(stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride)
    const cur = Buffer.alloc(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0, b = prev[x], c = x >= ch ? prev[x - ch] : 0
      let v = line[x]
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c) }
      cur[x] = v & 0xff
    }
    cur.copy(out, y * stride); prev = cur
  }
  const cov = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    let r, g, b, a
    if (colorType === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3] }
    else if (colorType === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; a = 255 }
    else if (colorType === 0) { r = g = b = out[i]; a = 255 }
    else { r = g = b = out[i * 2]; a = out[i * 2 + 1] }
    cov[i] = (a / 255) * (1 - (0.299 * r + 0.587 * g + 0.114 * b) / 255)
  }
  return { w, h, cov }
}

console.log('== render vs export pixel coverage max-diff ==')
for (const n of NAMES) {
  const a = decodePng(readFileSync(`${DIR}/${n}_render.png`))
  const b = decodePng(readFileSync(`${DIR}/${n}_export.png`))
  let mx = 0
  for (let i = 0; i < a.cov.length; i++) mx = Math.max(mx, Math.abs(a.cov[i] - b.cov[i]))
  console.log(`${n}: ${a.w}x${a.h} vs ${b.w}x${b.h}  maxDiff=${mx.toFixed(4)}`)
}

const pix = Object.fromEntries(NAMES.map(n => [n, decodePng(readFileSync(`${DIR}/${n}_render.png`))]))
const V = {
  identical: (x, y, N) => [x, y],
  mirrorX: (x, y, N) => [N - 1 - x, y],
  mirrorY: (x, y, N) => [x, N - 1 - y],
  rot180: (x, y, N) => [N - 1 - x, N - 1 - y],
  rot90cw: (x, y, N) => [N - 1 - y, x],
  rot90ccw: (x, y, N) => [y, N - 1 - x],
}
console.log('\n== pairwise relation on 16px canvas renders (mean abs diff) ==')
for (let i = 0; i < NAMES.length; i++) for (let j = i + 1; j < NAMES.length; j++) {
  const A = pix[NAMES[i]], B = pix[NAMES[j]], N = A.w
  const res = Object.entries(V).map(([k, f]) => {
    let e = 0
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [tx, ty] = f(x, y, N); e += Math.abs(A.cov[ty * N + tx] - B.cov[y * N + x]) }
    return [k, e / (N * N)]
  }).sort((a, b) => a[1] - b[1])
  console.log(`${NAMES[i]} vs ${NAMES[j]}: best=${res[0][0]} (${res[0][1].toFixed(4)}), next=${res[1][0]} (${res[1][1].toFixed(4)})`)
}

// self-symmetry of each render
console.log('\n== self-symmetry of each canvas render (mean abs diff vs its own transform) ==')
for (const n of NAMES) {
  const A = pix[n], N = A.w
  const out = Object.entries(V).filter(([k]) => k !== 'identical').map(([k, f]) => {
    let e = 0
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const [tx, ty] = f(x, y, N); e += Math.abs(A.cov[ty * N + tx] - A.cov[y * N + x]) }
    return `${k}=${(e / (N * N)).toFixed(4)}`
  })
  console.log(`${n}: ${out.join('  ')}`)
}
