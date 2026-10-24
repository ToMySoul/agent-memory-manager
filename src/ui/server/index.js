'use strict';

/**
 * amm ui 本地服务器：JSON API + 托管前端构建产物（src/ui/client/dist）。
 * 仅监听 127.0.0.1，纯 Node http，无第三方依赖。
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { handleApi } = require('./api.js');
const stateStoreFactory = require('./state.js');
const resources = require('../../lib/resources.js');

const DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
const DIST_KEY = 'src/ui/client/dist'; // SEA 内嵌资产键前缀

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function serveStatic(req, res, pathname) {
  let rel = pathname.replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  const norm = path.normalize(rel).replace(/\\/g, '/');

  if (resources.isSea()) {
    // 单文件可执行：前端产物从内嵌资产读取（资产键已用 / 分隔，无目录逃逸可能）
    let key = `${DIST_KEY}/${norm}`;
    if (!resources.resourceExists(key)) key = `${DIST_KEY}/index.html`; // SPA 回退
    if (!resources.resourceExists(key)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('界面资源缺失：该可执行文件构建不完整，请重新下载。');
      return;
    }
    const ext = path.extname(norm).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(resources.readResource(key));
    return;
  }

  const abs = path.normalize(path.join(DIST_DIR, rel));
  // 防目录逃逸：必须位于 dist 内
  if (!abs.startsWith(DIST_DIR + path.sep) && abs !== DIST_DIR) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  let target = abs;
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    // SPA 回退：非文件请求交给前端路由
    target = path.join(DIST_DIR, 'index.html');
    if (!fs.existsSync(target)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('前端尚未构建：请在 AMM 仓库执行 npm run build:ui 后重启 amm ui。');
      return;
    }
  }
  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
}

function createServer(stateStore) {
  const store = stateStore || {
    state: stateStoreFactory.load(),
    saveState: stateStoreFactory.save,
    openProject: stateStoreFactory.openProject,
  };

  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) {
      handleApi(req, res, url, store).catch((e) => {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: e.message }));
      });
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end();
      return;
    }
    serveStatic(req, res, url.pathname);
  });
}

function openBrowser(url) {
  const { spawn } = require('child_process');
  const plat = process.platform;
  const cmd = plat === 'win32' ? 'cmd' : plat === 'darwin' ? 'open' : 'xdg-open';
  const args = plat === 'win32' ? ['/c', 'start', '', url] : [url];
  try {
    spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
  } catch {
    /* 打开失败不阻塞服务 */
  }
}

/** 常见 Edge / Chrome 安装路径（app 模式宿主，Windows 10/11 一般预装 Edge） */
function findAppHostWin() {
  const fs2 = require('fs');
  const candidates = [];
  for (const env of ['ProgramFiles(x86)', 'ProgramFiles', 'LOCALAPPDATA']) {
    if (process.env[env]) {
      candidates.push(
        path.join(process.env[env], 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env[env], 'Google', 'Chrome', 'Application', 'chrome.exe'),
      );
    }
  }
  return candidates.find((p) => fs2.existsSync(p)) || null;
}

/**
 * 以「桌面客户端窗口」打开（默认）：Edge / Chrome app 模式——独立窗口、
 * 独立任务栏图标、无地址栏/标签页；找不到宿主时回退普通浏览器。
 */
function openAppWindow(url) {
  const { spawn } = require('child_process');
  try {
    if (process.platform === 'win32') {
      const exe = findAppHostWin();
      if (exe) {
        spawn(exe, [`--app=${url}`, '--window-size=1280,880'], { detached: true, stdio: 'ignore' }).unref();
        return 'app';
      }
    }
    if (process.platform === 'darwin') {
      // 优先 Edge / Chrome app 模式，失败回退默认浏览器
      for (const app of ['Microsoft Edge', 'Google Chrome']) {
        try {
          spawn('open', ['-na', app, '--args', `--app=${url}`], { detached: true, stdio: 'ignore' }).unref();
          return 'app';
        } catch { /* 尝试下一个 */ }
      }
    }
    openBrowser(url);
    return 'browser';
  } catch {
    openBrowser(url);
    return 'browser';
  }
}

/**
 * 启动 UI。
 * opts: { port = 8787, project = null（设为当前项目）, open = true（自动打开浏览器） }
 * 返回 http.Server（已 listen）。
 */
function start(opts = {}) {
  const port = opts.port != null && Number.isFinite(Number(opts.port)) ? Number(opts.port) : 8787;
  const stateStore = {
    state: stateStoreFactory.load(),
    saveState: stateStoreFactory.save,
    openProject: stateStoreFactory.openProject,
  };
  if (opts.project) {
    const p = path.resolve(String(opts.project));
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      stateStoreFactory.openProject(stateStore.state, p);
    } else {
      console.error(`✖  --project 指向的目录不存在：${p}`);
    }
  }

  const server = createServer(stateStore);
  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`✔  AMM 界面已启动：${url}`);
    if (stateStore.state.currentProject) {
      console.log(`   当前项目：${stateStore.state.currentProject}`);
    } else {
      console.log('   尚未选择项目：请在界面左侧「打开项目」选择本地目录。');
    }
    console.log('   停止服务：Ctrl + C');
    if (opts.open !== false) {
      let how = null;
      if (opts.browser) openBrowser(url);
      else how = openAppWindow(url);
      if (how === 'app') console.log('   已以桌面客户端窗口打开（Edge/Chrome app 模式；--browser 可改用普通浏览器）');
    }
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      // 已有实例在跑：直接弹客户端窗口接管，退出本进程（桌面软件的预期行为）
      console.log(`ℹ  端口 ${port} 已有 AMM 在运行，直接打开窗口（无需重复启动）。`);
      if (opts.open !== false) openAppWindow(`http://127.0.0.1:${port}`);
      process.exit(0);
    }
    console.error(`✖  启动失败：${e.message}`);
    process.exitCode = 1;
  });

  return server;
}

module.exports = { createServer, start, DIST_DIR };
