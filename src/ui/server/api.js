'use strict';

/**
 * 本地 JSON API：所有读写都经过 src/lib/memory.js（与 CLI 同一实现）。
 * 安全约束：只操作「当前选中项目」目录；除 AGENTS.md 合并与技能安装（均为
 * 显式按钮触发、固定相对路径）外，不写项目内 .memory/ 以外的任何位置。
 */

const fs = require('fs');
const path = require('path');
const memory = require('../../lib/memory.js');
const layout = require('../../lib/layout.js');
const agents = require('../../lib/agents.js');
const templates = require('../../lib/templates.js');
const zip = require('../../lib/zip.js');
const gitbackup = require('../../lib/gitbackup.js');

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('请求体不是合法 JSON'));
      }
    });
    req.on('error', reject);
  });
}

function projectInfo(cwd) {
  if (!cwd) return null;
  const initialized = memory.isInitialized(cwd);
  return {
    path: cwd,
    name: path.basename(cwd) || cwd,
    memoryInitialized: initialized,
    isGitRepo: fs.existsSync(path.join(cwd, '.git')),
    memoryDir: layout.memoryDir(cwd),
  };
}

/** 各智能体挂载检测（只读，不写任何文件） */
function detectAdapters(cwd) {
  const agentsMdPath = cwd ? path.join(cwd, 'AGENTS.md') : null;
  let agentsMd = { exists: false, hasSection: false };
  if (agentsMdPath && fs.existsSync(agentsMdPath)) {
    const text = fs.readFileSync(agentsMdPath, 'utf8');
    agentsMd = { exists: true, hasSection: text.includes(templates.AGENTS_MD_BEGIN) };
  }
  return Object.values(agents.ADAPTERS).map((a) => ({
    id: a.id,
    name: a.name,
    adaptAction: a.adaptAction,
    doc: a.doc,
    instructions: a.instructions,
    skillTargets: a.skillTargets,
    detection: {
      agentsMd,
      skills: a.skillTargets.map((t) => ({
        target: t,
        installed: cwd ? fs.existsSync(path.join(cwd, t, 'SKILL.md')) : false,
      })),
      privateMemoryDir: a.privateMemoryDir
        ? { path: a.privateMemoryDir, exists: fs.existsSync(a.privateMemoryDir) }
        : null,
    },
  }));
}

/** 极简路由表：method + 含 :param 的路径 */
const ROUTES = [
  ['GET', '/api/project', 'projectGet'],
  ['POST', '/api/project/open', 'projectOpen'],
  ['GET', '/api/settings', 'settingsGet'],
  ['POST', '/api/settings', 'settingsPost'],
  ['POST', '/api/memory/init', 'memoryInit'],
  ['GET', '/api/memory/overview', 'overview'],
  ['GET', '/api/memory/validate', 'validate'],
  ['GET', '/api/memory/:type', 'memoryGet'],
  ['POST', '/api/memory/:type', 'memoryPost'],
  ['POST', '/api/handoffs', 'handoffCreate'],
  ['GET', '/api/handoffs/:file', 'handoffGet'],
  ['GET', '/api/adapters', 'adaptersGet'],
  ['GET', '/api/adapters/doc', 'adapterDoc'],
  ['POST', '/api/adapters/agents-md', 'agentsMdApply'],
  ['POST', '/api/adapters/install-skill', 'skillInstall'],
  ['GET', '/api/search', 'search'],
  ['GET', '/api/backup.zip', 'backup'],
  ['GET', '/api/backup/status', 'backupGitStatus'],
  ['POST', '/api/backup/repo/init', 'backupRepoInit'],
  ['POST', '/api/backup/push', 'backupPush'],
];

function matchRoute(method, pathname) {
  for (const [m, pattern, name] of ROUTES) {
    if (m !== method) continue;
    const pp = pattern.split('/').filter(Boolean);
    const ap = pathname.split('/').filter(Boolean);
    if (pp.length !== ap.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      if (pp[i].startsWith(':')) params[pp[i].slice(1)] = decodeURIComponent(ap[i]);
      else if (pp[i] !== ap[i]) { ok = false; break; }
    }
    if (ok) return { name, params };
  }
  return null;
}

async function handleApi(req, res, url, stateStore) {
  const { state, saveState, openProject } = stateStore;
  const m = matchRoute(req.method, url.pathname);
  if (!m) return json(res, 404, { error: '接口不存在' });

  const { params } = m;
  const body = req.method === 'POST' ? await readBody(req) : {};
  const cwd = state.currentProject;
  const needProject = () => {
    if (!cwd || !fs.existsSync(cwd)) throw httpError(409, '尚未选择项目，请先在左侧「打开项目」');
    return cwd;
  };

  try {
    switch (m.name) {
      case 'projectGet':
        return json(res, 200, { project: projectInfo(cwd), recent: state.recentProjects, initialized: cwd ? memory.isInitialized(cwd) : false });

      case 'projectOpen': {
        const p = String(body.path || '').trim();
        if (!p) return json(res, 400, { error: '缺少 path 参数' });
        const abs = path.resolve(p);
        let st;
        try {
          st = fs.statSync(abs);
        } catch {
          return json(res, 400, { error: `目录不存在：${abs}` });
        }
        if (!st.isDirectory()) return json(res, 400, { error: `不是目录：${abs}` });
        openProject(state, abs);
        saveState(state);
        return json(res, 200, { project: projectInfo(abs), recent: state.recentProjects });
      }

      case 'settingsGet':
        return json(res, 200, state.settings);

      case 'settingsPost': {
        const s = body || {};
        if (s.theme === 'dark' || s.theme === 'system') state.settings.theme = s.theme;
        if (Array.isArray(s.defaultAgents)) state.settings.defaultAgents = s.defaultAgents.map(String).slice(0, 20);
        if (Number.isInteger(s.recentLimit) && s.recentLimit >= 1 && s.recentLimit <= 50) {
          state.settings.recentLimit = s.recentLimit;
          state.recentProjects = state.recentProjects.slice(0, s.recentLimit);
        }
        saveState(state);
        return json(res, 200, state.settings);
      }

      case 'memoryInit': {
        const dir = needProject();
        const r = memory.initMemory(dir, { force: true, withAgentsMd: !!body.withAgentsMd });
        return json(res, 200, {
          result: r,
          agentsMd: r.agentsMd ? agents.describeAgentsMdResult(r.agentsMd) : null,
          project: projectInfo(dir),
        });
      }

      case 'overview': {
        const dir = needProject();
        return json(res, 200, { project: projectInfo(dir), overview: memory.overview(dir) });
      }

      case 'validate': {
        const dir = needProject();
        return json(res, 200, memory.validateMemory(dir));
      }

      case 'memoryGet': {
        const dir = needProject();
        const type = params.type;
        if (type === 'handoffs') {
          return json(res, 200, { type, handoffs: memory.listHandoffDetails(dir) });
        }
        if (type === 'status') {
          const f = memory.readMemoryFile(dir, 'status');
          if (!f) return json(res, 404, { error: 'current-status.md 不存在，请先初始化' });
          return json(res, 200, { type, file: f.file, content: f.content, sections: layout.parseStatusSections(f.content) });
        }
        const f = memory.readMemoryFile(dir, type);
        if (!f) return json(res, 404, { error: `未知记忆类型或文件不存在：${type}` });
        return json(res, 200, { type, file: f.file, content: f.content, entries: memory.listEntries(dir, type) });
      }

      case 'memoryPost': {
        const dir = needProject();
        const type = params.type;
        const agent = String(body.agent || 'amm').trim() || 'amm';
        if (type === 'status') {
          return json(res, 200, memory.appendStatusUpdate(dir, { agent, summary: body.summary }));
        }
        if (!memory.MEMORY_TYPES[type]?.entryStyle) return json(res, 400, { error: `不支持在该类型上新建条目：${type}` });
        return json(res, 200, memory.appendEntry(dir, type, {
          agent,
          summary: body.summary,
          details: body.details,
          scope: body.scope,
          paths: body.paths,
        }));
      }

      case 'handoffCreate': {
        const dir = needProject();
        const sections = {
          done: body.done, todo: body.todo, risks: body.risks, next: body.next,
        };
        const r = memory.createHandoff(dir, {
          summary: body.summary,
          from: String(body.from || 'unknown'),
          to: String(body.to || 'unknown'),
          sections,
        });
        return json(res, 200, r);
      }

      case 'handoffGet': {
        const dir = needProject();
        const h = memory.readHandoff(dir, params.file);
        if (!h) return json(res, 404, { error: '交接文件不存在' });
        return json(res, 200, h);
      }

      case 'adaptersGet':
        return json(res, 200, { agents: detectAdapters(cwd), agentsMdSection: templates.AGENTS_MD_SECTION });

      case 'adapterDoc': {
        const id = String(url.searchParams.get('id') || '');
        const a = agents.ADAPTERS[id];
        if (!a || !a.doc) return json(res, 404, { error: '未知智能体' });
        const p = path.join(templates.pkgRoot(), a.doc);
        if (!fs.existsSync(p)) return json(res, 404, { error: `文档缺失：${a.doc}` });
        return json(res, 200, { id, title: a.name, path: a.doc, content: fs.readFileSync(p, 'utf8') });
      }

      case 'agentsMdApply': {
        const dir = needProject();
        const r = agents.applyAgentsMdSection(dir, false);
        return json(res, 200, { result: r, message: agents.describeAgentsMdResult(r) });
      }

      case 'skillInstall': {
        const dir = needProject();
        const id = String(body.agent || '');
        const a = agents.ADAPTERS[id];
        if (!a) return json(res, 400, { error: `未知智能体：${id}` });
        const results = a.skillTargets.map((t) => agents.installSkill(dir, t, false));
        return json(res, 200, {
          results,
          message: results.map((r) => agents.describeSkillResult(r)).join('\n'),
        });
      }

      case 'search': {
        const dir = needProject();
        const q = url.searchParams.get('q') || '';
        return json(res, 200, { query: q, hits: memory.searchMemory(dir, q) });
      }

      case 'backup': {
        const dir = needProject();
        const memDir = layout.memoryDir(dir);
        if (!fs.existsSync(memDir)) return json(res, 409, { error: '当前项目尚未初始化 .memory/' });
        const files = zip.collectDir(memDir, { prefix: 'memory' });
        const buf = zip.zipStore(files);
        const stamp = layout.fmtDate(new Date());
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="memory-backup-${stamp}.zip"`,
          'Content-Length': buf.length,
        });
        res.end(buf);
        return;
      }

      case 'backupGitStatus': {
        const dir = needProject();
        const memDir = layout.memoryDir(dir);
        if (!fs.existsSync(memDir)) return json(res, 200, { gitAvailable: gitbackup.gitOk(), isRepo: false, notInitialized: true });
        return json(res, 200, gitbackup.status(memDir));
      }

      case 'backupRepoInit': {
        const dir = needProject();
        const memDir = layout.memoryDir(dir);
        if (!fs.existsSync(memDir)) return json(res, 409, { error: '当前项目尚未初始化 .memory/' });
        const remote = String(body.remote || '').trim();
        const remoteOk = (s) =>
          !/\s/.test(s) && (
            /^(https?:\/\/|git@|ssh:\/\/)/.test(s) || // 远程 URL
            /^[A-Za-z]:[\\/][^\s]*$/.test(s) ||       // Windows 绝对路径（本地裸仓库）
            /^\/[^\s]*$/.test(s)                       // Unix 绝对路径
          );
        if (remote && !remoteOk(remote)) {
          return json(res, 400, { error: '备份仓库地址看起来不合法（支持 https:// 、git@ 、ssh:// 或本地路径，且不含空格）' });
        }
        const r = gitbackup.initRepo(memDir, remote || null);
        return json(res, 200, r);
      }

      case 'backupPush': {
        const dir = needProject();
        const memDir = layout.memoryDir(dir);
        if (!fs.existsSync(memDir)) return json(res, 409, { error: '当前项目尚未初始化 .memory/' });
        const r = gitbackup.commitAndPush(memDir, { message: body.message });
        r.status = gitbackup.status(memDir);
        return json(res, 200, r);
      }

      default:
        return json(res, 404, { error: '接口不存在' });
    }
  } catch (e) {
    if (e && e.statusCode) return json(res, e.statusCode, { error: e.message });
    return json(res, 400, { error: e.message });
  }
}

function httpError(code, msg) {
  const e = new Error(msg);
  e.statusCode = code;
  return e;
}

module.exports = { handleApi };
