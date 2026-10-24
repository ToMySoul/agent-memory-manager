'use strict';

const fs = require('fs');
const path = require('path');
const layout = require('../lib/layout.js');
const templates = require('../lib/templates.js');

exports.HELP = `
用法：amm handoff "<一句话摘要>" [--from <agent>] [--to <agent>]

在 .memory/handoffs/ 生成 YYYY-MM-DD_HHMM_<slug>.md 交接记录，
模板含：from / to、已完成、未完成、风险与注意、下一步。

选项：
  --from <agent>   交出方（默认取环境变量 AMM_AGENT，否则 unknown）
  --to <agent>     接收方（默认 unknown）
  -h, --help       显示本帮助
`.trim();

exports.run = function ({ flags, positionals, cwd }) {
  const summary = positionals.join(' ').trim();
  if (!summary) {
    console.error('缺少摘要参数。');
    console.error(exports.HELP);
    return 1;
  }

  const memDir = layout.memoryDir(cwd);
  if (!fs.existsSync(memDir)) {
    console.error(`未找到 ${layout.MEMORY_DIR}/，请先运行 amm init`);
    return 1;
  }

  const now = new Date();
  const date = layout.fmtDate(now);
  const hhmm = layout.fmtCompact(now);
  const from = String(flags.from || process.env.AMM_AGENT || 'unknown');
  const to = String(flags.to || 'unknown');
  const slug = layout.slugify(summary);

  let name = `${date}_${hhmm}_${slug}.md`;
  let n = 2;
  while (fs.existsSync(path.join(layout.handoffsDir(cwd), name))) {
    name = `${date}_${hhmm}_${slug}-${n++}.md`;
  }

  const content = templates.render(path.join('handoffs', '_template.md'), {
    SUMMARY: summary,
    DATE: date,
    TIME: layout.fmtTime(now),
    FROM: from,
    TO: to,
  });

  const target = path.join(layout.handoffsDir(cwd), name);
  fs.mkdirSync(layout.handoffsDir(cwd), { recursive: true });
  fs.writeFileSync(target, content);

  console.log(`✔  已生成交接记录：${path.relative(cwd, target)}`);
  console.log(`   from：${from}  →  to：${to}`);
  console.log('   请补全「已完成 / 未完成 / 风险与注意 / 下一步」后随 Git 提交。');
  return 0;
};
