'use strict';

/**
 * amm（Agent Memory Manager）— One memory. Every agent.
 * 命令行入口：参数解析与命令分发。纯 Node.js，无第三方依赖。
 */

const pkg = require('../package.json');

const COMMANDS = {
  init: {
    desc: '在当前项目创建 .memory/ 骨架（唯一真相来源）',
    usage: 'amm init [--force] [--with-agents-md]',
    mod: './commands/init.js',
  },
  validate: {
    desc: '校验 .memory/ 结构与条目格式（有 ERROR 时退出码非 0）',
    usage: 'amm validate',
    mod: './commands/validate.js',
  },
  status: {
    desc: '查看记忆概览：行数 / 条目数 / 最近交接 / 状态摘要',
    usage: 'amm status',
    mod: './commands/status.js',
  },
  handoff: {
    desc: '生成跨智能体交接记录 handoffs/YYYY-MM-DD_HHMM_<slug>.md',
    usage: 'amm handoff "<一句话摘要>" [--from <agent>] [--to <agent>]',
    mod: './commands/handoff.js',
  },
  sync: {
    desc: '扫描私有记忆目录（默认 ~/.codex/memories）并给出同步建议',
    usage: 'amm sync [--dir <path>]',
    mod: './commands/sync.js',
  },
  adapt: {
    desc: '为指定智能体写入 / 打印 .memory 挂载说明',
    usage: 'amm adapt --agent codex,dsh,zcode,grok [--dry-run]',
    mod: './commands/adapt.js',
  },
  ui: {
    desc: '启动本地 Web 管理界面（默认 http://127.0.0.1:8787）',
    usage: 'amm ui [--port 8787] [--project <path>] [--no-open]',
    mod: './commands/ui.js',
  },
};

const SHORT_FLAGS = { h: 'help', V: 'version', f: 'force' };

const REPO_URL = pkg.homepage || 'https://github.com/ToMySoul/agent-memory-manager';

function mainHelp() {
  const lines = Object.entries(COMMANDS).map(([k, v]) => `  ${k.padEnd(9)}${v.desc}`);
  console.log(`
amm（Agent Memory Manager）— One memory. Every agent.

在项目里初始化一次 .memory/，Codex、DeepSeek Harness（dsh）、ZCode、Grok 等
所有编程智能体读写同一份决策、踩坑、约定与进度。

用法：
  amm <命令> [参数]

命令：
${lines.join('\n')}

选项：
  -h, --help      显示帮助（可跟在命令后查看该命令帮助）
  -V, --version   显示版本

示例：
  amm init --with-agents-md
  amm status
  amm handoff "完成登录模块联调" --from codex --to dsh
  amm adapt --agent codex,zcode
  amm ui --port 8787

文档：${REPO_URL}
`);
}

function camel(s) {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** 解析 argv：`--flag value`、`--flag=value`、`--flag`、`-f` 与位置参数 */
function parseArgv(argv) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--') {
      positionals.push(...argv.slice(i + 1));
      break;
    }
    if (t.startsWith('--')) {
      const eq = t.indexOf('=');
      let key;
      let val;
      if (eq >= 0) {
        key = t.slice(2, eq);
        val = t.slice(eq + 1);
      } else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('-')) {
        key = t.slice(2);
        val = argv[++i];
      } else {
        key = t.slice(2);
        val = true;
      }
      flags[camel(key)] = val === 'false' ? false : val;
    } else if (t.startsWith('-') && t.length > 1) {
      for (const ch of t.slice(1)) flags[SHORT_FLAGS[ch] || ch] = true;
    } else {
      positionals.push(t);
    }
  }
  return { flags, positionals };
}

function run(argv) {
  if (argv.length === 0) {
    mainHelp();
    return 0;
  }
  const first = argv[0];
  if (['--help', '-h', 'help'].includes(first)) {
    mainHelp();
    return 0;
  }
  if (['--version', '-V', 'version'].includes(first)) {
    console.log(pkg.version);
    return 0;
  }

  const meta = COMMANDS[first];
  if (!meta) {
    console.error(`未知命令：${first}`);
    console.error(`运行 amm --help 查看可用命令：${Object.keys(COMMANDS).join('、')}`);
    return 1;
  }

  const { flags, positionals } = parseArgv(argv.slice(1));
  const mod = require(meta.mod);

  if (flags.help) {
    console.log(`\n${mod.HELP}\n`);
    return 0;
  }

  return mod.run({ flags, positionals, cwd: process.cwd() }) ?? 0;
}

exports.run = function (argv) {
  let code;
  try {
    code = run(argv);
  } catch (e) {
    console.error(`错误：${e.message}`);
    code = 1;
  }
  process.exitCode = code == null ? 0 : code;
};
