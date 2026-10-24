'use strict';

const agents = require('../lib/agents.js');

exports.HELP = `
用法：amm adapt --agent <id>[,<id>...] [--dry-run]

为指定智能体写入或打印 .memory 挂载说明：
  codex   实际写入：合并 AGENTS.md + 复制技能到 .agents/skills/shared-memory
  dsh     打印：应复制的路径与配置片段
  zcode   打印：应复制的路径与配置片段
  grok    打印：应复制的路径与配置片段

选项：
  --agent <ids>   逗号分隔的智能体列表（必填）
  --dry-run       只打印将执行的操作，不写入任何文件
  -h, --help      显示本帮助
`.trim();

exports.run = function ({ flags, cwd }) {
  if (!flags.agent) {
    console.error('缺少 --agent 参数。');
    console.error(`用法：amm adapt --agent ${agents.listIds().join(',')}`);
    return 1;
  }

  const ids = String(flags.agent).split(',').map((s) => s.trim()).filter(Boolean);
  for (const id of ids) {
    if (!agents.ADAPTERS[id]) {
      console.error(`未知智能体：${id}（可用：${agents.listIds().join('、')}）`);
      return 1;
    }
  }

  const dryRun = !!flags.dryRun;

  for (const id of ids) {
    const a = agents.ADAPTERS[id];
    console.log(`\n== ${a.name}（${id}）==`);
    if (a.adaptAction === 'write') {
      if (dryRun) console.log('  [dry-run] 以下操作未执行：');
      const r1 = agents.applyAgentsMdSection(cwd, dryRun);
      console.log('  ' + agents.describeAgentsMdResult(r1));
      for (const rel of a.skillTargets) {
        const r2 = agents.installSkill(cwd, rel, dryRun);
        console.log('  ' + agents.describeSkillResult(r2));
      }
      if (a.privateMemoryDir) {
        console.log(`  私有记忆目录（仅缓存，非真相来源）：${a.privateMemoryDir}`);
      }
    } else {
      for (const line of a.instructions) console.log('  ' + line);
    }
    if (a.doc) console.log(`  详细说明：${a.doc}（AMM 仓库内）`);
  }

  console.log('\n提示：amm init --with-agents-md 可为所有智能体统一写入 AGENTS.md 记忆段落。');
  return 0;
};
