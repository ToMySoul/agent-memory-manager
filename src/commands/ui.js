'use strict';

exports.HELP = `
用法：amm ui [--port 8787] [--project <path>] [--no-open]

启动本地 Web 管理界面（仅监听 127.0.0.1，纯本地读写）：
  查看 / 新建决策、踩坑、约定与交接，检测各智能体挂载状态，导出备份。

选项：
  --port <num>      监听端口（默认 8787）
  --project <path>  启动时直接打开的项目目录（可含或可 init .memory/）
  --no-open         不自动打开浏览器
  -h, --help        显示本帮助

示例：
  amm ui
  amm ui --port 9000 --project D:/workspace/my-app
`.trim();

exports.run = function ({ flags }) {
  const port = Number(flags.port) || 8787;
  require('../ui/server/index.js').start({
    port,
    project: flags.project,
    open: flags.open !== false,
  });
  // 服务器事件循环保持进程存活；此处返回 null（退出码 0 语义）
  return null;
};
