'use strict';

const fs = require('fs');
const path = require('path');
const layout = require('../lib/layout.js');

exports.HELP = `
用法：amm status

打印当前记忆概览：
  - 各记忆文件行数与条目数
  - 最近一次交接（文件名 + 摘要）
  - current-status.md 前几行摘要
`.trim();

exports.run = function ({ cwd }) {
  const memDir = layout.memoryDir(cwd);
  if (!fs.existsSync(memDir)) {
    console.error(`未找到 ${layout.MEMORY_DIR}/，请先运行 amm init`);
    return 1;
  }

  console.log('项目共享记忆概览');
  console.log(`  ${memDir}\n`);

  const nameWidth = 18;
  console.log(`  ${'文件'.padEnd(nameWidth)}${'行数'.padEnd(8)}条目`);
  for (const rel of layout.REQUIRED_FILES) {
    const p = path.join(memDir, rel);
    if (!fs.existsSync(p)) {
      console.log(`  ${rel.padEnd(nameWidth)}缺失`);
      continue;
    }
    const text = fs.readFileSync(p, 'utf8');
    const lines = text.split(/\r?\n/).length;
    const entries = layout.ENTRY_FILES.includes(rel)
      ? `${layout.extractEntries(text).length} 条`
      : '—';
    console.log(`  ${rel.padEnd(nameWidth)}${String(lines).padEnd(8)}${entries}`);
  }

  const handoffs = layout.listHandoffs(cwd);
  if (handoffs.length > 0) {
    const latest = handoffs[0];
    const text = fs.readFileSync(path.join(layout.handoffsDir(cwd), latest), 'utf8');
    const title = (text.match(/^#\s+(.*)$/m) || [])[1] || '';
    console.log(`\n最近交接：${latest}`);
    if (title) console.log(`  ${title}`);
  } else {
    console.log('\n最近交接：（暂无，仅模板）');
  }

  const csPath = path.join(memDir, 'current-status.md');
  if (fs.existsSync(csPath)) {
    const preview = fs
      .readFileSync(csPath, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(1, 7); // 跳过一级标题
    console.log('\ncurrent-status 摘要：');
    for (const l of preview) console.log(`  ${l}`);
  }
  return 0;
};
