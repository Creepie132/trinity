#!/usr/bin/env node
// Generates PWA icons using only Node.js built-in modules (zlib, fs)
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

// CRC32 table
const crcTable = new Uint32Array(256)
for (let i = 0; i < 256; i++) {
  let c = i
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
  }
  crcTable[i] = c
}

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function writeUInt32BE(buf, value, offset) {
  buf[offset]     = (value >>> 24) & 0xff
  buf[offset + 1] = (value >>> 16) & 0xff
  buf[offset + 2] = (value >>> 8)  & 0xff
  buf[offset + 3] =  value         & 0xff
}

function createChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  writeUInt32BE(lenBuf, data.length, 0)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBuf = Buffer.alloc(4)
  writeUInt32BE(crcBuf, crc32(crcInput), 0)
  return Buffer.concat([lenBuf, typeBytes, data, crcBuf])
}

// Returns true if pixel (px, py) in a size×size canvas is part of the letter T
function isLetterT(px, py, size) {
  const pad   = size * 0.18   // outer padding
  const thick = size * 0.15   // stroke thickness
  const cx    = size / 2      // center x

  // Horizontal bar: full width minus padding, top section
  const barX1 = pad
  const barX2 = size - pad
  const barY1 = pad
  const barY2 = pad + thick

  // Vertical stem: centered, from bar bottom to bottom padding
  const stemX1 = cx - thick / 2
  const stemX2 = cx + thick / 2
  const stemY1 = barY2
  const stemY2 = size - pad

  return (
    (px >= barX1  && px <= barX2  && py >= barY1  && py <= barY2)  ||
    (px >= stemX1 && px <= stemX2 && py >= stemY1 && py <= stemY2)
  )
}

function createIcon(size) {
  const bgR = 99, bgG = 102, bgB = 241  // #6366f1

  // IHDR
  const ihdr = Buffer.alloc(13)
  writeUInt32BE(ihdr, size, 0)
  writeUInt32BE(ihdr, size, 4)
  ihdr[8]  = 8  // bit depth
  ihdr[9]  = 2  // RGB
  ihdr[10] = 0  // deflate
  ihdr[11] = 0  // no filter
  ihdr[12] = 0  // no interlace

  // Raw pixel data with filter byte per row
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3)
    row[0] = 0  // filter: None
    for (let x = 0; x < size; x++) {
      const off = 1 + x * 3
      if (isLetterT(x, y, size)) {
        row[off]     = 255  // R white
        row[off + 1] = 255  // G white
        row[off + 2] = 255  // B white
      } else {
        row[off]     = bgR
        row[off + 1] = bgG
        row[off + 2] = bgB
      }
    }
    rows.push(row)
  }

  const rawData  = Buffer.concat(rows)
  const compressed = zlib.deflateSync(rawData, { level: 9 })

  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([
    sig,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ])
}

const outDir = path.join(__dirname, '..', 'public', 'icons')
fs.mkdirSync(outDir, { recursive: true })

for (const size of [192, 512]) {
  const buf  = createIcon(size)
  const file = path.join(outDir, `icon-${size}.png`)
  fs.writeFileSync(file, buf)
  console.log(`✅ Created ${file} (${buf.length} bytes)`)
}
