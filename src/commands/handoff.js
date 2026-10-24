'use strict';

const memory = require('../lib/memory.js');

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

  let r;
  try {
    r = memory.createHandoff(cwd, {
      summary,
      from: String(flags.from || process.env.AMM_AGENT || 'unknown'),
      to: String(flags.to || 'unknown'),
    });
  } catch (e) {
    console.error(e.message);
    return 1;
  }

  console.log(`✔  已生成交接记录：${r.file}`);
  console.log(`   from：${r.from}  →  to：${r.to}`);
  console.log('   请补全「已完成 / 未完成 / 风险与注意 / 下一步」后随 Git 提交。');
  return 0;
};
