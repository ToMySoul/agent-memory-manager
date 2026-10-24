'use strict';

/**
 * 各智能体适配注册表（与 packages/spec/agent-adapters.yaml 保持一致）。
 * adaptAction:
 *   'write'  → amm adapt 直接写入（AGENTS.md 段落 + 复制技能）
 *   'print'  → amm adapt 只打印应复制的路径与配置片段
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const templates = require('./templates.js');

/** 安装包内技能源目录 */
const SKILL_SRC = path.join(templates.pkgRoot(), 'skills', 'shared-memory');

const ADAPTERS = {
  codex: {
    id: 'codex',
    name: 'OpenAI Codex CLI',
    adaptAction: 'write',
    skillTargets: ['.agents/skills/shared-memory'],
    privateMemoryDir: path.join(os.homedir(), '.codex', 'memories'),
    doc: 'adapters/codex.md',
    instructions: [],
  },
  dsh: {
    id: 'dsh',
    name: 'DeepSeek Harness（dsh）',
    adaptAction: 'print',
    skillTargets: ['.dsh/skills/shared-memory'],
    privateMemoryDir: path.join(os.homedir(), '.dsh', 'memories'),
    doc: 'adapters/deepseek-harness.md',
    instructions: [
      '1. 记忆纪律：dsh 通过项目根目录的 AGENTS.md 读取项目约定，写入记忆段落：',
      '     amm init --with-agents-md',
      '2. 技能（可选）：若你的 dsh 版本支持技能目录，复制技能：',
      `     源：${SKILL_SRC}`,
      '     目标：<项目>/.dsh/skills/shared-memory',
      '3. 降级：不支持技能时，纯文件读写 .memory/ 即可（读写纪律见 .memory/README.md）。',
    ],
  },
  zcode: {
    id: 'zcode',
    name: 'ZCode',
    adaptAction: 'print',
    skillTargets: ['.zcode/skills/shared-memory'],
    privateMemoryDir: null,
    doc: 'adapters/zcode.md',
    instructions: [
      '1. AGENTS.md：ZCode 支持项目级 AGENTS.md 指令文件，写入记忆纪律段落：',
      '     amm init --with-agents-md',
      '2. 技能：若你的版本支持项目级技能目录，复制技能：',
      `     源：${SKILL_SRC}`,
      '     目标：<项目>/.zcode/skills/shared-memory',
      '     也可通过 ZCode 插件 / 技能市场机制分发（技能名：shared-memory）。',
      '3. 降级：纯文件读写 .memory/，遵守 .memory/README.md 的读写纪律。',
    ],
  },
  grok: {
    id: 'grok',
    name: 'Grok / 其他支持 AGENTS.md 的智能体',
    adaptAction: 'print',
    skillTargets: ['.agents/skills/shared-memory'],
    privateMemoryDir: null,
    doc: 'adapters/grok.md',
    instructions: [
      '1. AGENTS.md 是通用兜底：在项目根目录写入记忆纪律段落：',
      '     amm init --with-agents-md',
      '2. 技能（可选）：若支持 SKILL.md 技能目录（如 .agents/skills/）：',
      `     cp -r "${SKILL_SRC}"  <项目>/.agents/skills/shared-memory`,
      '3. 降级：纯文件读写 .memory/。',
      '   其他任何支持 AGENTS.md 或 SKILL.md 的智能体同理接入。',
    ],
  },
};

function listIds() {
  return Object.keys(ADAPTERS);
}

/**
 * 生成 / 合并项目根目录 AGENTS.md 的记忆纪律段落（幂等：marker 已存在则跳过）。
 * 返回 { action: 'created'|'appended'|'skipped'|'would-create'|'would-append', target }
 */
function applyAgentsMdSection(cwd, dryRun) {
  const target = path.join(cwd, 'AGENTS.md');
  if (fs.existsSync(target)) {
    const text = fs.readFileSync(target, 'utf8');
    if (text.includes(templates.AGENTS_MD_BEGIN)) return { action: 'skipped', target };
    if (dryRun) return { action: 'would-append', target };
    fs.appendFileSync(target, (text.endsWith('\n') ? '' : '\n') + '\n' + templates.AGENTS_MD_SECTION + '\n');
    return { action: 'appended', target };
  }
  if (dryRun) return { action: 'would-create', target };
  fs.writeFileSync(target, templates.AGENTS_MD_SECTION + '\n');
  return { action: 'created', target };
}

/**
 * 复制技能源目录（skills/shared-memory）到项目内目标目录。
 * 返回 { action: 'copied'|'skipped'|'would-copy'|'missing-src', target, files }
 */
function installSkill(cwd, relTarget, dryRun) {
  const dst = path.join(cwd, relTarget);
  if (!fs.existsSync(SKILL_SRC)) return { action: 'missing-src', target: SKILL_SRC };
  if (fs.existsSync(dst)) return { action: 'skipped', target: relTarget };
  if (dryRun) return { action: 'would-copy', target: relTarget };
  fs.mkdirSync(dst, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(SKILL_SRC)) {
    const sp = path.join(SKILL_SRC, f);
    if (fs.statSync(sp).isFile()) {
      fs.copyFileSync(sp, path.join(dst, f));
      n++;
    }
  }
  return { action: 'copied', target: relTarget, files: n };
}

function describeAgentsMdResult(r) {
  switch (r.action) {
    case 'created': return `✔  已创建 ${r.target}，并写入记忆纪律段落`;
    case 'appended': return `✔  已在 ${r.target} 末尾追加记忆纪律段落`;
    case 'skipped': return `ℹ  ${r.target} 已包含记忆段落，跳过`;
    case 'would-create': return `[dry-run] 将创建 ${r.target} 并写入记忆纪律段落`;
    case 'would-append': return `[dry-run] 将在 ${r.target} 追加记忆纪律段落`;
    default: return '';
  }
}

function describeSkillResult(r) {
  switch (r.action) {
    case 'copied': return `✔  已安装技能 → ${r.target}（${r.files} 个文件）`;
    case 'skipped': return `ℹ  ${r.target} 已存在，跳过`;
    case 'would-copy': return `[dry-run] 将复制技能 → ${r.target}`;
    case 'missing-src': return `✖  技能源目录缺失：${r.target}（安装包不完整）`;
    default: return '';
  }
}

module.exports = {
  SKILL_SRC,
  ADAPTERS,
  listIds,
  applyAgentsMdSection,
  installSkill,
  describeAgentsMdResult,
  describeSkillResult,
};
