'use strict';

/**
 * 模板渲染：templates/project-memory/ 是唯一模板来源，
 * 运行时读取并做 {{VAR}} 占位符替换（DATE / TIME / FROM / TO / SUMMARY 等）。
 * 通过 resources 抽象读取：源码目录与单文件可执行（SEA 内嵌资产）两种形态通用。
 */

const path = require('path');
const resources = require('./resources.js');

function pkgRoot() {
  return resources.PKG_ROOT;
}

const TEMPLATE_DIR = path.join(resources.PKG_ROOT, 'templates', 'project-memory');

/** 相对 TEMPLATE_DIR 的模板文件清单（amm init 逐个落盘） */
const TEMPLATE_FILES = [
  'README.md',
  'decisions.md',
  'gotchas.md',
  'conventions.md',
  'current-status.md',
  path.join('handoffs', '_template.md'),
];

/** 读取模板并替换 {{KEY}} 占位符 */
function render(rel, vars) {
  let text = resources.readResource(path.join('templates', 'project-memory', rel)).toString('utf8');
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split('{{' + k + '}}').join(String(v));
    }
  }
  return text;
}

const AGENTS_MD_BEGIN = '<!-- amm:memory-section begin -->';
const AGENTS_MD_END = '<!-- amm:memory-section end -->';

/** 写入项目 AGENTS.md 的记忆纪律段落（由成对的 marker 包裹，便于幂等合并） */
const AGENTS_MD_SECTION = [
  AGENTS_MD_BEGIN,
  '## 项目共享记忆（Agent Memory Manager）',
  '',
  '本项目使用 `.memory/` 作为唯一的项目记忆真相来源（Single Source of Truth），',
  '供所有编程智能体（Codex、DeepSeek Harness、ZCode、Grok 等）与人共同读写，并纳入 Git 追踪。',
  '',
  '### 读写纪律（所有智能体必须遵守）',
  '',
  '- 任务开始前：先读 `.memory/current-status.md`、`.memory/decisions.md`、`.memory/conventions.md`，建议再读 `.memory/gotchas.md`',
  '- 任务结束后：更新 `.memory/current-status.md`；产生新决策 / 踩坑 / 约定时，分别追加到 `decisions.md` / `gotchas.md` / `conventions.md`',
  '- 条目格式：`### YYYY-MM-DD | agent:<name> | 一句话摘要`（详见 `.memory/README.md`）',
  '- 跨智能体交接：执行 `amm handoff "<一句话摘要>" --from <agent> --to <agent>`，或按模板手写 `.memory/handoffs/` 记录',
  '- **禁止**把重要信息只写入智能体私有记忆（如 `~/.codex/memories/`）而不同步到 `.memory/`；冲突时以 `.memory/` 为准',
  '',
  '> 工具：`amm status` / `amm validate`；规范：Agent Memory Manager 仓库 `packages/spec/`',
  AGENTS_MD_END,
].join('\n');

module.exports = {
  pkgRoot,
  TEMPLATE_DIR,
  TEMPLATE_FILES,
  render,
  AGENTS_MD_SECTION,
  AGENTS_MD_BEGIN,
  AGENTS_MD_END,
};
