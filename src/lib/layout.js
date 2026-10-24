'use strict';

/**
 * .memory/ 目录规范：结构常量、条目解析、文件名与日期工具。
 * 规范正文见 packages/spec/memory-layout.md 与 packages/spec/entry-format.md。
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = '.memory';
const HANDOFFS_DIR = 'handoffs';

/** 必需文件（相对 .memory/） */
const REQUIRED_FILES = ['decisions.md', 'gotchas.md', 'conventions.md', 'current-status.md', 'README.md'];

/** 需要按条目格式（### 日期 | agent:xxx | 摘要）校验的文件 */
const ENTRY_FILES = ['decisions.md', 'gotchas.md', 'conventions.md'];

/** 条目标题：### YYYY-MM-DD | agent:<name> | 一句话摘要 */
const ENTRY_HEADING_RE = /^###\s+(\d{4}-\d{2}-\d{2})\s*\|\s*agent:([A-Za-z0-9_.-]+)\s*\|\s*(\S.*)$/;

/** 交接文件名：YYYY-MM-DD_HHMM_<slug>.md */
const HANDOFF_NAME_RE = /^\d{4}-\d{2}-\d{2}_\d{4}_.+\.md$/;

function memoryDir(cwd) {
  return path.join(cwd, MEMORY_DIR);
}

function handoffsDir(cwd) {
  return path.join(cwd, MEMORY_DIR, HANDOFFS_DIR);
}

/** 列出交接文件（新→旧，按文件名排序；排除 _ 开头的模板） */
function listHandoffs(cwd) {
  const dir = handoffsDir(cwd);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.md') && !f.startsWith('_'))
    .sort()
    .reverse();
}

/**
 * 提取文件中所有三级标题（条目），自动跳过 ``` / ~~~ 围栏代码块。
 * 返回 [{ line, heading, ok, date, agent, summary }]
 */
function extractEntries(text) {
  const out = [];
  let inFence = false;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (/^###\s/.test(line)) {
      const m = ENTRY_HEADING_RE.exec(line);
      out.push({
        line: i + 1,
        heading: line.replace(/^###\s*/, '').trim(),
        ok: !!m,
        date: m ? m[1] : undefined,
        agent: m ? m[2] : undefined,
        summary: m ? m[3] : undefined,
      });
    }
  }
  return out;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function fmtDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** HH:MM，用于正文展示 */
function fmtTime(d) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** HHMM，用于文件名 */
function fmtCompact(d) {
  return `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/** 由摘要生成文件名 slug：保留中文与字母数字，空白转连字符，剔除 Windows 非法字符 */
function slugify(s) {
  const slug = String(s)
    .trim()
    .replace(/[\s/\\]+/g, '-')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug || 'handoff';
}

module.exports = {
  MEMORY_DIR,
  HANDOFFS_DIR,
  REQUIRED_FILES,
  ENTRY_FILES,
  ENTRY_HEADING_RE,
  HANDOFF_NAME_RE,
  memoryDir,
  handoffsDir,
  listHandoffs,
  extractEntries,
  fmtDate,
  fmtTime,
  fmtCompact,
  slugify,
};
