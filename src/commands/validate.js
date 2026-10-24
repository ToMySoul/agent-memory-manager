'use strict';

const layout = require('../lib/layout.js');
const memory = require('../lib/memory.js');

exports.HELP = `
用法：amm validate

校验 .memory/：
  - 必需文件与目录是否齐全（缺失 → ERROR）
  - 条目是否包含 日期 / 作者 Agent / 摘要（不规范 → WARN）
  - 交接文件命名与 from/to 字段（不规范 → WARN）

退出码：存在 ERROR 时为 1，否则 0（WARN 不影响退出码）。
`.trim();

const PAD = { OK: '[OK]    ', WARN: '[WARN]  ', ERROR: '[ERROR] ' };

exports.run = function ({ cwd }) {
  console.log(`校验目标：${layout.memoryDir(cwd)}\n`);
  const r = memory.validateMemory(cwd);
  for (const l of r.lines) console.log(`  ${PAD[l.level]}${l.msg}`);

  const c = r.counts;
  console.log(`\n结果：${c.ok} OK / ${c.warn} WARN / ${c.error} ERROR`);
  if (c.error > 0) {
    console.log('存在 ERROR，退出码 1。');
    return 1;
  }
  if (c.warn > 0) console.log('存在 WARN，建议修复（不影响退出码）。');
  return 0;
};
