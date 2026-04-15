/**
 * Minimal ZIP file builder using Node.js built-in zlib.
 * Produces valid .zip / .xlsx containers — no external dependencies.
 */

import { deflateRawSync } from 'zlib';

// ── CRC-32 ───────────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Little-endian helpers ─────────────────────────────────────────────────────

function u16le(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n & 0xffff, 0);
  return b;
}

function u32le(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n >>> 0, 0);
  return b;
}

// ── Writer ────────────────────────────────────────────────────────────────────

interface Entry {
  nameBuf: Buffer;
  data: Buffer;
  compressed: Buffer;
  crc: number;
  localOffset: number; // byte offset of this entry's local file header
}

export class ZipWriter {
  private entries: Entry[] = [];
  private localBytesWritten = 0;

  add(name: string, content: string | Buffer): void {
    const nameBuf = Buffer.from(name, 'utf8');
    const data = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
    const compressed = deflateRawSync(data, { level: 6 });
    const crc = crc32(data);

    this.entries.push({
      nameBuf,
      data,
      compressed,
      crc,
      localOffset: this.localBytesWritten,
    });

    // 30-byte local file header + name + compressed data
    this.localBytesWritten += 30 + nameBuf.length + compressed.length;
  }

  build(): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];

    for (const e of this.entries) {
      // Local file header
      localParts.push(
        Buffer.from([0x50, 0x4b, 0x03, 0x04]), // PK\x03\x04
        u16le(20),            // version needed: 2.0
        u16le(0),             // general purpose bit flag
        u16le(8),             // compression method: deflate
        u16le(0), u16le(0),   // last mod time, date (zeroed)
        u32le(e.crc),
        u32le(e.compressed.length),
        u32le(e.data.length),
        u16le(e.nameBuf.length),
        u16le(0),             // extra field length
        e.nameBuf,
        e.compressed,
      );

      // Central directory header
      centralParts.push(
        Buffer.from([0x50, 0x4b, 0x01, 0x02]), // PK\x01\x02
        u16le(20), u16le(20), // version made by, version needed
        u16le(0),             // flags
        u16le(8),             // compression
        u16le(0), u16le(0),   // mod time, date
        u32le(e.crc),
        u32le(e.compressed.length),
        u32le(e.data.length),
        u16le(e.nameBuf.length),
        u16le(0),             // extra field length
        u16le(0),             // file comment length
        u16le(0),             // disk number start
        u16le(0),             // internal file attributes
        u32le(0),             // external file attributes
        u32le(e.localOffset), // offset of local file header
        e.nameBuf,
      );
    }

    const centralDirOffset = this.localBytesWritten;
    const centralDir = Buffer.concat(centralParts);

    // End of central directory record
    const eocd = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x05, 0x06]), // PK\x05\x06
      u16le(0), u16le(0),                     // disk number, disk with start of central dir
      u16le(this.entries.length),
      u16le(this.entries.length),
      u32le(centralDir.length),
      u32le(centralDirOffset),
      u16le(0),                               // comment length
    ]);

    return Buffer.concat([...localParts, centralDir, eocd]);
  }
}
