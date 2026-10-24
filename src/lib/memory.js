'use strict';

/**
 * .memory/ 读写核心：CLI 与 Web UI 共用的唯一实现。
 * 所有落盘格式（init 骨架 / 条目标题 / 交接文件命名与正文）均以
 * templates/project-memory/ + layout.js 为准，UI 层不得另写一套。
 */

const fs = require('fs');
const path = require('path');
const layout = require('./layout.js');
const templates = require('./templates.js');
const agents = require('./agents.js');

/** UI 使用的记忆类型注册表（与 .memory/ 文件一一对应） */
const MEMORY_TYPES = {
  decisions: { file: 'decisions.md', title: '决策记录', desc: '技术选型、架构取舍、方向变更', icon: '🧭', entryStyle: true },
  gotchas: { file: 'gotchas.md', title: '踩坑记录', desc: '踩过的坑与解法，避免重复踩', icon: '⚠️', entryStyle: true },
  conventions: { file: 'conventions.md', title: '项目约定', desc: '命名、目录、流程等团队约定', icon: '📜', entryStyle: true },
  status: { file: 'current-status.md', title: '当前状态', desc: '进度与阻塞，每次任务后更新', icon: '📍', entryStyle: false },
};

const HANDOFF_SECTION_ORDER = ['done', 'todo', 'risks', 'next'];

function isInitialized(cwd) {
  return fs.existsSync(layout.memoryDir(cwd)) && fs.existsSync(path.join(layout.memoryDir(cwd), 'decisions.md'));
}

/**
 * 初始化 .memory/（与 amm init 完全同一逻辑）。
 * 返回 { created, filled, skipped, memDir, agentsMd }；agentsMd 为 agents.applyAgentsMdSection 结果或 null。
 */
function initMemory(cwd, { force = false, withAgentsMd = false } = {}) {
  const memDir = layout.memoryDir(cwd);
  if (fs.existsSync(memDir) && !force) {
    return { created: 0, filled: 0, skipped: 0, memDir, agentsMd: withAgentsMd ? agents.applyAgentsMdSection(cwd, false) : null, alreadyExists: true };
  }

  const vars = { DATE: layout.fmtDate(new Date()), TIME: layout.fmtTime(new Date()), AGENT: 'amm' };
  let created = 0;
  let filled = 0;
  let skipped = 0;

  for (const rel of templates.TEMPLATE_FILES) {
    const target = path.join(memDir, rel);
    if (fs.existsSync(target)) {
      if (fs.readFileSync(target, 'utf8').trim() !== '') {
        skipped++;
        continue;
      }
      fs.writeFileSync(target, templates.render(rel, vars));
      filled++;
    } else {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, templates.render(rel, vars));
      created++;
    }
  }

  return { created, filled, skipped, memDir, agentsMd: withAgentsMd ? agents.applyAgentsMdSection(cwd, false) : null, alreadyExists: false };
}

/** 读取某类记忆文件原文 */
function readMemoryFile(cwd, type) {
  const meta = MEMORY_TYPES[type];
  if (!meta) return null;
  const p = path.join(layout.memoryDir(cwd), meta.file);
  if (!fs.existsSync(p)) return null;
  return { type, file: meta.file, path: p, content: fs.readFileSync(p, 'utf8') };
}

/** 条目列表（含正文），新→旧 */
function listEntries(cwd, type) {
  const f = readMemoryFile(cwd, type);
  if (!f) return null;
  return layout.parseEntryBlocks(f.content).reverse();
}

/**
 * 追加条目到 decisions / gotchas / conventions。
 * 落盘格式与模板说明一致：### YYYY-MM-DD | agent:<name> | 摘要 + 详情/影响范围/相关路径。
 */
function appendEntry(cwd, type, { agent = 'amm', summary, details, scope, paths, date } = {}) {
  const meta = MEMORY_TYPES[type];
  if (!meta || !meta.entryStyle) throw new Error(`不支持在该类型上追加条目：${type}`);
  summary = String(summary || '').trim();
  if (!summary) throw new Error('摘要不能为空');
  const file = path.join(layout.memoryDir(cwd), meta.file);
  if (!fs.existsSync(file)) throw new Error(`未找到 ${layout.MEMORY_DIR}/${meta.file}，请先初始化`);

  const lines = [`### ${date || layout.fmtDate(new Date())} | agent:${agent} | ${summary}`];
  if (details) lines.push(`- 详情：${details}`);
  if (scope) lines.push(`- 影响范围：${scope}`);
  if (paths) lines.push(`- 相关路径：${paths}`);

  const text = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, text.replace(/\n*$/, '\n') + '\n' + lines.join('\n') + '\n');
  return { file: `${layout.MEMORY_DIR}/${meta.file}`, heading: lines[0] };
}

/** 在 current-status.md 的「## 最近更新」顶部插入一条更新（最新在最上） */
function appendStatusUpdate(cwd, { agent = 'amm', summary } = {}) {
  summary = String(summary || '').trim();
  if (!summary) throw new Error('摘要不能为空');
  const file = path.join(layout.memoryDir(cwd), 'current-status.md');
  if (!fs.existsSync(file)) throw new Error(`未找到 ${layout.MEMORY_DIR}/current-status.md，请先初始化`);

  const now = new Date();
  const item = `- ${layout.fmtDate(now)} ${layout.fmtTime(now)} | agent:${agent} | ${summary}`;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const idx = lines.findIndex((l) => /^##\s+最近更新/.test(l));
  if (idx >= 0) {
    lines.splice(idx + 1, 0, item);
  } else {
    lines.push('', '## 最近更新', '', item, '');
  }
  fs.writeFileSync(file, lines.join('\n'));
  return { file: `${layout.MEMORY_DIR}/current-status.md`, heading: item };
}

/** 把交接模板中四个「- （待填写）」依序替换为给定清单 */
function fillHandoffSections(rendered, sections = {}) {
  const bullets = HANDOFF_SECTION_ORDER.map((k) => {
    const arr = Array.isArray(sections[k]) ? sections[k] : [];
    const items = arr.map((s) => String(s).trim()).filter(Boolean);
    return items.length ? items.map((s) => `- ${s}`).join('\n') : null;
  });
  let i = 0;
  return rendered
    .split(/\r?\n/)
    .map((line) => (/^-\s*（待填写）\s*$/.test(line.trim()) ? bullets[i++] || line : line))
    .join('\n');
}

/**
 * 生成交接文件（与 amm handoff 同一命名与模板）。
 * sections: { done: [], todo: [], risks: [], next: [] }（可省略，留待手填）
 * 返回 { file: 相对项目路径, absPath, content }
 */
function createHandoff(cwd, { summary, from = 'unknown', to = 'unknown', sections } = {}) {
  summary = String(summary || '').trim();
  if (!summary) throw new Error('摘要不能为空');
  const memDir = layout.memoryDir(cwd);
  if (!fs.existsSync(memDir)) throw new Error(`未找到 ${layout.MEMORY_DIR}/，请先初始化`);

  const now = new Date();
  const date = layout.fmtDate(now);
  const hhmm = layout.fmtCompact(now);
  const slug = layout.slugify(summary);

  let name = `${date}_${hhmm}_${slug}.md`;
  let n = 2;
  while (fs.existsSync(path.join(layout.handoffsDir(cwd), name))) {
    name = `${date}_${hhmm}_${slug}-${n++}.md`;
  }

  let content = templates.render(path.join('handoffs', '_template.md'), {
    SUMMARY: summary,
    DATE: date,
    TIME: layout.fmtTime(now),
    FROM: from,
    TO: to,
  });
  if (sections) content = fillHandoffSections(content, sections);

  const absPath = path.join(layout.handoffsDir(cwd), name);
  fs.mkdirSync(layout.handoffsDir(cwd), { recursive: true });
  fs.writeFileSync(absPath, content);
  return { file: `${layout.MEMORY_DIR}/handoffs/${name}`, absPath, content, from, to };
}

/** 解析交接文件正文 → { title, summary, date, time, from, to, sections } */
function parseHandoffText(text) {
  const title = (text.match(/^#\s+(.*)$/m) || [])[1] || '';
  const summary = title.replace(/^Handoff[：:]\s*/, '') || title;
  const dateM = text.match(/-\s*日期[：:]\s*(\S+)(?:\s+(\S+))?/);
  const fromM = text.match(/-\s*from[：:]\s*(\S+)/i);
  const toM = text.match(/-\s*to[：:]\s*(\S+)/i);
  const sections = {};
  let name = null;
  for (const line of text.split(/\r?\n/)) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      name = h[1].trim();
      sections[name] = [];
      continue;
    }
    if (!name) continue;
    const t = line.trim();
    if (/^-\s+/.test(t) && !/^-\s*（待填写）/.test(t) && !/^-\s*（暂无）/.test(t)) {
      sections[name].push(t.replace(/^-\s+/, ''));
    }
  }
  return {
    title,
    summary,
    date: dateM ? dateM[1] : undefined,
    time: dateM ? dateM[2] : undefined,
    from: fromM ? fromM[1] : undefined,
    to: toM ? toM[1] : undefined,
    sections,
  };
}

/** 交接列表（新→旧）：[{ file, mtime, meta: parseHandoffText 结果 }] */
function listHandoffDetails(cwd) {
  const dir = layout.handoffsDir(cwd);
  return layout.listHandoffs(cwd).map((f) => {
    const abs = path.join(dir, f);
    const text = fs.readFileSync(abs, 'utf8');
    return { file: f, mtime: fs.statSync(abs).mtimeMs, meta: parseHandoffText(text) };
  });
}

/** 读取单个交接文件（文件名必须来自目录列表，防路径逃逸） */
function readHandoff(cwd, name) {
  if (!layout.listHandoffs(cwd).includes(name)) return null;
  const abs = path.join(layout.handoffsDir(cwd), name);
  const content = fs.readFileSync(abs, 'utf8');
  return { file: name, content, meta: parseHandoffText(content) };
}

/** 概览：初始化状态、各类计数、状态摘要、最近交接 */
function overview(cwd) {
  const initialized = isInitialized(cwd);
  const counts = {};
  for (const [type, meta] of Object.entries(MEMORY_TYPES)) {
    if (!initialized) {
      counts[type] = 0;
      continue;
    }
    if (meta.entryStyle) {
      const f = readMemoryFile(cwd, type);
      counts[type] = f ? layout.extractEntries(f.content).length : 0;
    } else {
      counts[type] = 0;
    }
  }
  const handoffs = initialized ? listHandoffDetails(cwd) : [];
  counts.handoffs = handoffs.length;

  let statusSummary = { blocked: false, sections: {}, updates: [] };
  if (initialized) {
    const f = readMemoryFile(cwd, 'status');
    if (f) {
      const sections = layout.parseStatusSections(f.content);
      const updates = (sections['最近更新'] || []).slice(0, 5);
      const blockedItems = sections['阻塞 / 待决'] || [];
      statusSummary = { blocked: blockedItems.length > 0, sections, updates };
    }
  }

  return {
    initialized,
    counts,
    statusSummary,
    recentHandoffs: handoffs.slice(0, 5).map((h) => ({ file: h.file, meta: h.meta })),
  };
}

/** 校验（与 amm validate 同一规则），返回 { counts, lines: [{level, msg}] } */
function validateMemory(cwd) {
  const counts = { ok: 0, warn: 0, error: 0 };
  const lines = [];
  const ok = (msg) => { counts.ok++; lines.push({ level: 'OK', msg }); };
  const warn = (msg) => { counts.warn++; lines.push({ level: 'WARN', msg }); };
  const error = (msg) => { counts.error++; lines.push({ level: 'ERROR', msg }); };

  const memDir = layout.memoryDir(cwd);
  if (!fs.existsSync(memDir) || !fs.statSync(memDir).isDirectory()) {
    error(`未找到 ${layout.MEMORY_DIR}/ 目录，请先运行 amm init`);
    return { counts, lines };
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
    if (layout.ENTRY_FILES.includes(rel)) {
      for (const e of layout.extractEntries(text)) {
        if (!e.ok) {
          warn(`条目缺少 日期 / 作者 / 摘要：${layout.MEMORY_DIR}/${rel}:${e.line}「${e.heading.slice(0, 40)}」（应为 ### YYYY-MM-DD | agent:<name> | 一句话摘要）`);
        }
      }
    }
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

  return { counts, lines };
}

/** 全文搜索 .memory/ 下所有 md（逐行匹配，忽略大小写），返回 [{ file, line, text }] */
function searchMemory(cwd, query, { limit = 200 } = {}) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const root = layout.memoryDir(cwd);
  const hits = [];
  (function walk(dir) {
    if (hits.length >= limit || !fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (hits.length >= limit) return;
      const abs = path.join(dir, f);
      const st = fs.statSync(abs);
      if (st.isDirectory()) {
        walk(abs);
      } else if (f.toLowerCase().endsWith('.md')) {
        const rel = path.relative(root, abs).replace(/\\/g, '/');
        const text = fs.readFileSync(abs, 'utf8');
        text.split(/\r?\n/).forEach((line, i) => {
          if (hits.length < limit && line.toLowerCase().includes(q)) {
            hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 200) });
          }
        });
      }
    }
  })(root);
  return hits;
}

module.exports = {
  MEMORY_TYPES,
  HANDOFF_SECTION_ORDER,
  isInitialized,
  initMemory,
  readMemoryFile,
  listEntries,
  appendEntry,
  appendStatusUpdate,
  fillHandoffSections,
  createHandoff,
  parseHandoffText,
  listHandoffDetails,
  readHandoff,
  overview,
  validateMemory,
  searchMemory,
};
