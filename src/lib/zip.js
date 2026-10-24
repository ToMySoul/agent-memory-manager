'use strict';

/**
 * 零依赖 ZIP 打包（仅存储不压缩，method=store），用于 .memory/ 备份导出。
 * 文件名使用 UTF-8 标志位（bit 11），支持中文交接文件名。
 */

const fs = require('fs');
const path = require('path');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

/** DOS 时间（2 字节）/ 日期（2 字节） */
function dosDateTime(d) {
  const time = ((d.getHours() & 0x1f) << 11) | ((d.getMinutes() & 0x3f) << 5) | ((d.getSeconds() >> 1) & 0x1f);
  const date = (((d.getFullYear() - 1980) & 0x7f) << 9) | (((d.getMonth() + 1) & 0xf) << 5) | (d.getDate() & 0x1f);
  return { time, date };
}

/**
 * files: [{ name: '相对路径/含.md', data: Buffer, mtime?: Date }]
 * 返回完整 zip 的 Buffer。
 */
function zipStore(files) {
  const now = new Date();
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const f of files) {
    const nameBuf = Buffer.from(String(f.name).replace(/\\/g, '/'), 'utf8');
    const data = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
    const { time, date } = dosDateTime(f.mtime instanceof Date ? f.mtime : now);
    const crc = crc32(data);

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0x0800, 6); // UTF-8 名称
    local.writeUInt16LE(0, 8); // store
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra len
    nameBuf.copy(local, 30);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra
    central.writeUInt16LE(0, 32); // comment
    central.writeUInt16LE(0, 34); // disk start
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);

    locals.push(local, data);
    centrals.push(central);
    offset += local.length + data.length;
  }

  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20); // comment len

  return Buffer.concat([...locals, centralBuf, eocd]);
}

/** 递归收集目录下所有文件 → [{ name（相对 root）, data, mtime }]；prefix 指定顶层目录名前缀 */
function collectDir(root, { prefix = '' } = {}) {
  const out = [];
  if (!fs.existsSync(root)) return out;
  (function walk(dir, rel) {
    for (const f of fs.readdirSync(dir)) {
      if (f === '.git') continue; // 备份仓库元数据不进 zip
      const abs = path.join(dir, f);
      const r = rel ? `${rel}/${f}` : f;
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs, r);
      else out.push({ name: prefix ? `${prefix}/${r}` : r, data: fs.readFileSync(abs), mtime: st.mtime });
    }
  })(root, '');
  return out;
}

module.exports = { zipStore, collectDir, crc32 };
