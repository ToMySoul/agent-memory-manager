'use strict';

/**
 * UI API 冒烟测试：真实启动 amm ui 服务器（随机端口、隔离状态文件），
 * 走完「打开项目 → init → 新建条目 / 状态更新 / 交接 → 搜索 → 校验 →
 * 适配检测与写入 → 备份 zip」全链路，并核对落盘格式与 CLI 一致。
 * 运行：npm test（在 smoke.js 之后）
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
process.env.AMM_STATE_FILE = path.join(os.tmpdir(), `amm-ui-state-test-${process.pid}.json`);

let pass = 0;
let fail = 0;
function check(name, cond, extra) {
  if (cond) {
    pass++;
    console.log(`  ok    ${name}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${extra ? '\n        ' + String(extra).split('\n').join('\n        ') : ''}`);
  }
}

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'amm-ui-'));
  const cli = (args) => spawnSyncNode([path.join(ROOT, 'bin', 'amm'), ...args], tmp);

  function spawnSyncNode(args, cwd) {
    const r = require('child_process').spawnSync(process.execPath, args, { cwd, encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  }

  function gitSync(args, cwd) {
    const r = require('child_process').spawnSync('git', args, { cwd, encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
  }

  // 先用 CLI init，保证 UI 读到的与 CLI 产物完全一致
  let r = cli(['init']);
  check('amm init（前置）', r.code === 0, r.out);

  const server = spawn(process.execPath, [path.join(ROOT, 'bin', 'amm'), 'ui', '--port', '0', '--no-open'], {
    env: process.env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let port = null;
  const bootLog = [];
  server.stdout.on('data', (d) => { bootLog.push(String(d)); });
  await wait(1200);
  const m = bootLog.join('').match(/127\.0\.0\.1:(\d+)/);
  port = m ? Number(m[1]) : null;
  check('服务器启动并报告端口', !!port, bootLog.join(''));

  const base = `http://127.0.0.1:${port}`;
  async function j(method, url, body) {
    const res = await fetch(base + url, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    const text = await res.text();
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { status: res.status, data, headers: res.headers };
  }

  try {
    console.log('\n== 1. 项目打开与信息 ==');
    let q = await j('GET', '/api/project');
    check('GET /api/project 200', q.status === 200);
    let open = await j('POST', '/api/project/open', { path: tmp });
    check('打开项目 200', open.status === 200 && open.data.project.memoryInitialized === true, JSON.stringify(open.data));
    q = await j('POST', '/api/project/open', { path: path.join(tmp, 'no-such-dir') });
    check('打开不存在目录 → 400', q.status === 400);

    console.log('\n== 2. 概览 ==');
    q = await j('GET', '/api/memory/overview');
    check('overview 200 且 initialized', q.status === 200 && q.data.overview.initialized === true);
    check('overview 计数字段齐全', ['decisions', 'gotchas', 'conventions', 'handoffs'].every((k) => k in q.data.overview.counts));

    console.log('\n== 3. 新建条目与状态更新（落盘核对）==');
    q = await j('POST', '/api/memory/decisions', { agent: 'codex', summary: '本地缓存选型 SQLite', details: '避免引入服务端', scope: '数据层', paths: 'src/db/*' });
    check('新建决策 200', q.status === 200 && /\.memory\/decisions\.md$/.test(q.data.file), JSON.stringify(q.data));
    let text = fs.readFileSync(path.join(tmp, '.memory', 'decisions.md'), 'utf8');
    check('decisions.md 含规范标题', /^### \d{4}-\d{2}-\d{2} \| agent:codex \| 本地缓存选型 SQLite$/m.test(text), text);
    check('decisions.md 含详情/影响范围/相关路径', text.includes('- 详情：避免引入服务端') && text.includes('- 影响范围：数据层') && text.includes('- 相关路径：src/db/*'));
    check('原有内容保留（模板头还在）', text.includes('# 决策记录（Decisions）'));

    q = await j('POST', '/api/memory/gotchas', { agent: 'zcode', summary: 'Windows 控制台传中文需 UTF-8' });
    check('新建踩坑 200', q.status === 200);
    q = await j('POST', '/api/memory/status', { agent: 'amm', summary: '完成 UI 联调' });
    check('状态更新 200', q.status === 200);
    text = fs.readFileSync(path.join(tmp, '.memory', 'current-status.md'), 'utf8');
    check('current-status 最近更新置顶', /## 最近更新\s*\n- \d{4}-\d{2}-\d{2} [\d:]+ \| agent:amm \| 完成 UI 联调/.test(text), text);

    q = await j('GET', '/api/memory/decisions');
    check('GET 条目列表解析出条目', q.status === 200 && q.data.entries.some((e) => e.summary === '本地缓存选型 SQLite' && e.agent === 'codex'));
    q = await j('POST', '/api/memory/decisions', { summary: '' });
    check('空摘要 → 400', q.status === 400);

    console.log('\n== 4. 交接 ==');
    q = await j('POST', '/api/handoffs', {
      summary: '完成登录模块联调', from: 'codex', to: 'dsh',
      done: ['登录接口联调通过'], todo: ['补齐错误码'], risks: [], next: ['提交代码'],
    });
    check('新建交接 200', q.status === 200 && /^\d{4}-\d{2}-\d{2}_\d{4}_.+\.md$/.test(q.data.file.split('/').pop()), JSON.stringify(q.data));
    const hName = q.data.file.split('/').pop();
    text = fs.readFileSync(path.join(tmp, '.memory', 'handoffs', hName), 'utf8');
    check('交接含 from/to 与四节', /from：codex/.test(text) && /to：dsh/.test(text) && ['已完成', '未完成', '风险与注意', '下一步'].every((s) => text.includes(s)));
    check('交接段落已填充', text.includes('- 登录接口联调通过') && text.includes('- 提交代码') && text.includes('- （待填写）'));

    q = await j('GET', '/api/memory/handoffs');
    check('交接列表 200', q.status === 200 && q.data.handoffs.some((h) => h.file === hName));
    q = await j('GET', `/api/handoffs/${encodeURIComponent(hName)}`);
    check('读取单个交接 200', q.status === 200 && q.data.meta.from === 'codex');
    q = await j('GET', '/api/handoffs/..%2F..%2Fpackage.json');
    check('路径逃逸被拒绝', q.status === 404 || q.status === 400);

    console.log('\n== 5. 搜索 ==');
    q = await j('GET', '/api/search?q=' + encodeURIComponent('SQLite'));
    check('搜索命中 decisions.md', q.status === 200 && q.data.hits.some((h) => h.file === 'decisions.md'));

    console.log('\n== 6. 校验 ==');
    q = await j('GET', '/api/memory/validate');
    check('校验 200 且无 ERROR', q.status === 200 && q.data.counts.error === 0, JSON.stringify(q.data.counts));

    console.log('\n== 7. 适配器 ==');
    q = await j('GET', '/api/adapters');
    check('适配检测含 codex/zcode/dsh', q.status === 200 && ['codex', 'zcode', 'dsh'].every((id) => q.data.agents.some((a) => a.id === id)));
    q = await j('POST', '/api/adapters/agents-md', {});
    check('写入 AGENTS.md 段落', q.status === 200 && fs.readFileSync(path.join(tmp, 'AGENTS.md'), 'utf8').includes('amm:memory-section begin'));
    q = await j('POST', '/api/adapters/install-skill', { agent: 'codex' });
    check('安装技能到 .agents/skills/shared-memory', q.status === 200 && fs.existsSync(path.join(tmp, '.agents', 'skills', 'shared-memory', 'SKILL.md')));
    q = await j('GET', '/api/adapters/doc?id=codex');
    check('适配文档读取', q.status === 200 && q.data.content.includes('Codex'));

    console.log('\n== 8. 备份 zip ==');
    const res = await fetch(base + '/api/backup.zip');
    const buf = Buffer.from(await res.arrayBuffer());
    check('zip 200 且 PK 头', res.status === 200 && buf[0] === 0x50 && buf[1] === 0x4b);
    check('zip 含中央目录 EOCD', buf.slice(-22).readUInt32LE(0) === 0x06054b50);
    const names = [];
    for (let i = 0; i + 46 < buf.length; i++) {
      if (buf.readUInt32LE(i) === 0x02014b50) {
        const len = buf.readUInt16LE(i + 28);
        names.push(buf.slice(i + 46, i + 46 + len).toString('utf8'));
      }
    }
    check('zip 收录 .memory 文件（含中文交接名）', names.includes('memory/decisions.md') && names.some((n) => n.startsWith('memory/handoffs/') && n !== 'memory/handoffs/_template.md'), names.join(','));
    check('zip 不含 .git 目录', !names.some((n) => n.includes('.git/')), names.join(','));

    console.log('\n== 8.5 Git 备份仓库（本地裸仓库模拟远程）==');
    const bareDir = path.join(tmp, 'remote-memory.git');
    fs.mkdirSync(bareDir, { recursive: true });
    gitSync(['init', '--bare', bareDir], tmp);
    q = await j('GET', '/api/backup/status');
    check('备份状态：未初始化仓库', q.status === 200 && q.data.isRepo === false && q.data.gitAvailable === true);
    q = await j('POST', '/api/backup/repo/init', { remote: bareDir });
    check('初始化备份仓库 + 设置 origin', q.status === 200 && q.data.status.isRepo === true && q.data.status.remote === bareDir, JSON.stringify(q.data));
    q = await j('POST', '/api/backup/push', { message: '首次备份' });
    check('提交并推送成功', q.status === 200 && q.data.pushed === true && q.data.committed === true, JSON.stringify(q.data));
    check('推送后无未提交改动', q.data.status.dirty === false && q.data.status.lastCommit.subject === '首次备份');
    const remoteFiles = gitSync(['-C', bareDir, 'ls-tree', '-r', '--name-only', 'HEAD'], tmp);
    check('远程仓库已收到记忆文件', /decisions\.md/.test(remoteFiles.out) && /handoffs\//.test(remoteFiles.out), remoteFiles.out + remoteFiles.err);
    q = await j('POST', '/api/memory/gotchas', { agent: 'zcode', summary: '推送后再写入一条' });
    check('推送后新增改动 → 状态变脏', q.status === 200 && (await j('GET', '/api/backup/status')).data.dirty === true);
    q = await j('POST', '/api/backup/push', {});
    check('自动提交说明推送', q.status === 200 && q.data.committed === true && /^AMM 备份/.test(q.data.message), JSON.stringify(q.data));
    q = await j('POST', '/api/backup/repo/init', { remote: 'not a valid ||| repo' });
    check('非法远程地址被拒绝', q.status === 400);

    console.log('\n== 9. 刷新后数据仍在（文件即数据）==');
    q = await j('GET', '/api/memory/overview');
    check('decisions=1 · gotchas=2 · handoffs=1', q.data.overview.counts.decisions === 1 && q.data.overview.counts.gotchas === 2 && q.data.overview.counts.handoffs === 1, JSON.stringify(q.data.overview.counts));

    console.log('\n== 10. 静态页面 ==');
    const page = await fetch(base + '/');
    const html = await page.text();
    check('SPA index 返回 200 且含 root', page.status === 200 && html.includes('id="root"'));
    const deep = await fetch(base + '/handoffs');
    check('深链回退到 index', deep.status === 200 && (await deep.text()).includes('id="root"'));
  } finally {
    server.kill();
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    try { fs.rmSync(process.env.AMM_STATE_FILE, { force: true }); } catch {}
  }

  console.log(`\n结果：${pass} 通过，${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
