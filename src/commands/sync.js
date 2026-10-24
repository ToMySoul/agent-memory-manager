'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const layout = require('../lib/layout.js');

exports.HELP = `
用法：amm sync [--dir <path>]

扫描私有记忆目录（默认 ~/.codex/memories），列出最近修改的文件，
并按关键词启发式给出「疑似决策 / 踩坑 / 约定」的同步建议。

本命令只打印建议，不修改任何文件。可用 --dir 指定其他目录。
`.trim();

/** 关键词启发式：命中即建议写入对应 .memory 文件 */
const RULES = [
  { re: /(决定|决策|选型|改用|最终采用|敲定|decided|chose|switched to|settled on)/i, target: 'decisions.md' },
  { re: /(踩坑|坑|陷阱|注意|报错|异常|失败|修复|绕过|gotcha|pitfall|workaround|bug)/i, target: 'gotchas.md' },
  { re: /(约定|规范|命名|风格|统一使用|必须|禁止|convention|naming|style guide)/i, target: 'conventions.md' },
];

exports.run = function ({ flags, cwd }) {
  const dir = flags.dir
    ? path.resolve(cwd, String(flags.dir))
    : path.join(os.homedir(), '.codex', 'memories');

  console.log(`扫描私有记忆目录：${dir}`);
  if (!fs.existsSync(dir)) {
    console.log('  未找到该目录（可能尚未使用 Codex 记忆功能，或路径不同）。');
    console.log('  可用 --dir <path> 指定其他私有记忆目录。');
    console.log('\n说明：amm 不依赖任何私有记忆目录；.memory/ 始终是唯一真相来源。');
    return 0;
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md') || f.toLowerCase().endsWith('.txt'))
    .map((f) => {
      const p = path.join(dir, f);
      const st = fs.statSync(p);
      return st.isFile() ? { f, p, mtime: st.mtimeMs, size: st.size } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    console.log('  目录为空（没有 .md / .txt 文件）。');
    return 0;
  }

  const recent = files.slice(0, 10);
  console.log(`\n最近文件（按修改时间，前 ${recent.length} 个）：`);
  for (const x of recent) {
    console.log(`  ${layout.fmtDate(new Date(x.mtime))}  ${String(x.size).padStart(7)} B  ${x.f}`);
  }

  console.log('\n疑似可同步片段（启发式匹配，仅建议）：');
  let found = 0;
  scan: for (const x of files.slice(0, 5)) {
    let text;
    try {
      text = fs.readFileSync(x.p, 'utf8');
    } catch {
      continue;
    }
    const lines = text.split(/\r?\n/);
    let inFence = false;
    let count = 0;
    for (let i = 0; i < lines.length && count < 6; i++) {
      const line = lines[i].trim();
      if (/^(```|~~~)/.test(line)) {
        inFence = !inFence;
        continue;
      }
      if (inFence || line.length < 8 || line.length > 160 || line.startsWith('#')) continue;
      const rule = RULES.find((r) => r.re.test(line));
      if (rule) {
        console.log(`  → ${rule.target}｜${x.f}:${i + 1}｜${line}`);
        found++;
        count++;
        if (found >= 20) break scan;
      }
    }
  }
  if (found === 0) console.log('  （未发现明显像决策 / 踩坑 / 约定的片段）');

  console.log('\n请人工确认后写入 .memory/ 对应文件，或用 amm handoff 记录一次交接。');
  console.log('本命令不会修改任何文件。');
  return 0;
};
