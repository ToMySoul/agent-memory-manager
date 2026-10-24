'use strict';

const fs = require('fs');
const path = require('path');
const layout = require('../lib/layout.js');
const templates = require('../lib/templates.js');
const agents = require('../lib/agents.js');

exports.HELP = `
用法：amm init [--force] [--with-agents-md]

在当前目录创建 .memory/ 完整骨架：
  decisions.md / gotchas.md / conventions.md / current-status.md / README.md / handoffs/

选项：
  --force            已存在时：补全缺失文件、覆盖空文件（绝不删除已有内容）
  --with-agents-md   同时在项目根目录生成 / 合并 AGENTS.md 的记忆纪律段落
  -h, --help         显示本帮助
`.trim();

exports.run = function ({ flags, cwd }) {
  const memDir = layout.memoryDir(cwd);

  if (fs.existsSync(memDir) && !flags.force) {
    console.log(`ℹ  ${layout.MEMORY_DIR}/ 已存在，未做任何修改。`);
    console.log('   如需补全缺失文件或覆盖空文件（不会删除已有内容），请使用：amm init --force');
    return 0;
  }

  const vars = {
    DATE: layout.fmtDate(new Date()),
    TIME: layout.fmtTime(new Date()),
    AGENT: 'amm',
  };

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

  console.log(`✔  初始化完成：新建 ${created} 个文件，覆盖空文件 ${filled} 个，保留已有内容 ${skipped} 个`);
  console.log(`   位置：${memDir}`);

  if (flags.withAgentsMd) {
    const r = agents.applyAgentsMdSection(cwd, false);
    console.log('   ' + agents.describeAgentsMdResult(r));
  }

  console.log('\n下一步：');
  console.log('  amm validate   # 校验结构与条目格式');
  console.log('  amm status     # 查看记忆概览');
  console.log('  amm adapt --agent codex   # （可选）为 Codex 挂载技能与 AGENTS.md');
  return 0;
};
