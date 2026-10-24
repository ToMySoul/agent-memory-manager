'use strict';

const fs = require('fs');
const path = require('path');
const layout = require('../lib/layout.js');

exports.HELP = `
用法：amm validate

校验 .memory/：
  - 必需文件与目录是否齐全（缺失 → ERROR）
  - 条目是否包含 日期 / 作者 Agent / 摘要（不规范 → WARN）
  - 交接文件命名与 from/to 字段（不规范 → WARN）

退出码：存在 ERROR 时为 1，否则 0（WARN 不影响退出码）。
`.trim();

exports.run = function ({ cwd }) {
  const counts = { ok: 0, warn: 0, error: 0 };

  const ok = (msg) => { counts.ok++; console.log(`  [OK]    ${msg}`); };
  const warn = (msg) => { counts.warn++; console.log(`  [WARN]  ${msg}`); };
  const error = (msg) => { counts.error++; console.log(`  [ERROR] ${msg}`); };

  const memDir = layout.memoryDir(cwd);
  console.log(`校验目标：${memDir}\n`);

  if (!fs.existsSync(memDir) || !fs.statSync(memDir).isDirectory()) {
    error(`未找到 ${layout.MEMORY_DIR}/ 目录，请先运行 amm init`);
    return finish();
  }

  for (const rel of layout.REQUIRED_FILES) {
    const p = path.join(memDir, rel);
    if (!fs.existsSync(p)) {
      error(`缺少必需文件 ${layout.MEMORY_DIR}/${rel}`);
      continue;
    }
    if (!fs.statSync(p).isFile()) {
      error(`${layout.MEMORY_DIR}/${rel} 不是普通文件`);
      continue;
    }
    const text = fs.readFileSync(p, 'utf8');
    if (text.trim() === '') {
      warn(`${layout.MEMORY_DIR}/${rel} 为空文件`);
      continue;
    }
    ok(`${layout.MEMORY_DIR}/${rel}`);
    if (layout.ENTRY_FILES.includes(rel)) checkEntries(rel, text);
  }

  const hd = layout.handoffsDir(cwd);
  if (!fs.existsSync(hd) || !fs.statSync(hd).isDirectory()) {
    error('缺少必需目录 .memory/handoffs/');
  } else {
    const handoffs = layout.listHandoffs(cwd);
    if (handoffs.length === 0) {
      ok('.memory/handoffs/（暂无交接记录，仅模板）');
    } else {
      ok(`.memory/handoffs/（${handoffs.length} 条交接）`);
      for (const h of handoffs) {
        if (!layout.HANDOFF_NAME_RE.test(h)) {
          warn(`交接文件名不符合 YYYY-MM-DD_HHMM_<slug>.md 格式：${h}`);
        }
        const text = fs.readFileSync(path.join(hd, h), 'utf8');
        if (!/from[：:]/i.test(text) || !/to[：:]/i.test(text)) {
          warn(`交接文件缺少 from / to 字段：${h}`);
        }
      }
    }
  }

  return finish();

  function checkEntries(rel, text) {
    for (const e of layout.extractEntries(text)) {
      if (!e.ok) {
        warn(`条目缺少 日期 / 作者 / 摘要：${layout.MEMORY_DIR}/${rel}:${e.line}「${e.heading.slice(0, 40)}」（应为 ### YYYY-MM-DD | agent:<name> | 一句话摘要）`);
      }
    }
  }

  function finish() {
    console.log(`\n结果：${counts.ok} OK / ${counts.warn} WARN / ${counts.error} ERROR`);
    if (counts.error > 0) {
      console.log('存在 ERROR，退出码 1。');
      return 1;
    }
    if (counts.warn > 0) console.log('存在 WARN，建议修复（不影响退出码）。');
    return 0;
  }
};
