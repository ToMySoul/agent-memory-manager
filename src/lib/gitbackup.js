'use strict';

/**
 * .memory/ 独立 Git 备份仓库（借鉴 Skills Manager「一份原件 + 同步」模式）：
 * 把 .memory/ 本身初始化为独立 git 仓库，推送到用户配置的私有远程。
 * 适用场景：开源项目工作区——记忆不混入开源代码，单独成私有仓库。
 *
 * 全部通过 spawn('git', [args]) 调用（不经 shell，无注入风险），仅操作 .memory 目录。
 */

const { spawnSync } = require('child_process');

const DEFAULT_TIMEOUT = 30 * 1000;
const PUSH_TIMEOUT = 120 * 1000;

function runGit(args, { cwd, timeout = DEFAULT_TIMEOUT, inputUser = null } = {}) {
  const finalArgs = inputUser ? ['-c', `user.name=${inputUser.name}`, '-c', `user.email=${inputUser.email}`, ...args] : args;
  const r = spawnSync('git', finalArgs, { cwd, encoding: 'utf8', timeout, windowsHide: true });
  return {
    code: r.status,
    out: (r.stdout || '').trim(),
    err: (r.stderr || '').trim(),
    failed: r.error != null || (r.status !== null && r.status !== 0),
  };
}

function gitOk() {
  const r = runGit(['--version']);
  return !r.failed;
}

/** 备份仓库状态：{ gitAvailable, isRepo, branch, remote, dirty, dirtyCount, lastCommit } */
function status(memoryDir) {
  const st = { gitAvailable: gitOk(), isRepo: false, branch: null, remote: null, dirty: false, dirtyCount: 0, lastCommit: null };
  if (!st.gitAvailable) return st;
  if (!runGit(['rev-parse', '--git-dir'], { cwd: memoryDir }).failed) st.isRepo = true;
  else return st;

  const branch = runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: memoryDir });
  if (!branch.failed) st.branch = branch.out;

  const remote = runGit(['remote', 'get-url', 'origin'], { cwd: memoryDir });
  if (!remote.failed) st.remote = remote.out;

  const dirty = runGit(['status', '--porcelain'], { cwd: memoryDir });
  if (!dirty.failed) {
    st.dirtyCount = dirty.out ? dirty.out.split(/\r?\n/).length : 0;
    st.dirty = st.dirtyCount > 0;
  }

  const last = runGit(['log', '-1', '--pretty=format:%h|%ad|%s', '--date=short'], { cwd: memoryDir });
  if (!last.failed && last.out) {
    const [hash, date, ...subject] = last.out.split('|');
    st.lastCommit = { hash, date, subject: subject.join('|') };
  }
  return st;
}

/**
 * 初始化 / 更新备份仓库：.memory 内 git init（幂等）+ 设置 origin。
 * remoteUrl 为空时只做 init。返回 { status, log: [步骤输出] }
 */
function initRepo(memoryDir, remoteUrl) {
  const log = [];
  if (!gitOk()) throw new Error('未检测到 git，请先安装 Git');

  if (!runGit(['rev-parse', '--git-dir'], { cwd: memoryDir }).failed) {
    log.push('ℹ .memory 已是 Git 仓库，跳过 init');
  } else {
    const r = runGit(['init'], { cwd: memoryDir });
    if (r.failed) throw new Error(`git init 失败：${r.err || r.out}`);
    log.push(`✔ ${r.out.split(/\r?\n/)[0] || 'git init 完成'}`);
  }

  if (remoteUrl) {
    const existing = runGit(['remote', 'get-url', 'origin'], { cwd: memoryDir });
    const action = existing.failed ? ['remote', 'add', 'origin', remoteUrl] : ['remote', 'set-url', 'origin', remoteUrl];
    const r = runGit(action, { cwd: memoryDir });
    if (r.failed) throw new Error(`设置远程失败：${r.err || r.out}`);
    log.push(existing.failed ? `✔ 已添加远程 origin → ${remoteUrl}` : `✔ 已更新远程 origin → ${remoteUrl}`);
  } else if (runGit(['remote', 'get-url', 'origin'], { cwd: memoryDir }).failed) {
    log.push('⚠ 未填写备份仓库地址，稍后可在备份页配置');
  }
  return { status: status(memoryDir), log };
}

/**
 * 提交并推送全部改动到 origin。
 * 返回 { pushed, committed, message, log }；没有任何改动且远端已是最新时 pushed=false。
 */
function commitAndPush(memoryDir, { message } = {}) {
  const log = [];
  const st = status(memoryDir);
  if (!st.gitAvailable) throw new Error('未检测到 git，请先安装 Git');
  if (!st.isRepo) throw new Error('.memory 还不是 Git 仓库，请先初始化备份仓库');
  if (!st.remote) throw new Error('未配置备份仓库地址（origin），请先在上方填写并初始化');

  // 提交身份：优先用用户已有配置，缺省时用 AMM 本地身份兜底
  const hasName = !runGit(['config', 'user.email'], { cwd: memoryDir }).failed;
  const identity = hasName ? null : { name: 'AMM Backup', email: 'amm-backup@local' };
  if (identity) log.push('ℹ 未检测到 git 全局身份，本次提交使用 AMM Backup 本地身份');

  const msg = message && String(message).trim() ? String(message).trim() : `AMM 备份 ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`;
  let committed = false;

  if (st.dirty) {
    const add = runGit(['add', '-A'], { cwd: memoryDir, inputUser: identity });
    if (add.failed) throw new Error(`git add 失败：${add.err || add.out}`);
    const commit = runGit(['commit', '-m', msg], { cwd: memoryDir, inputUser: identity });
    if (commit.failed) throw new Error(`git commit 失败：${commit.err || commit.out}`);
    committed = true;
    log.push(`✔ 已提交 ${st.dirtyCount} 个文件改动：${msg}`);
  } else {
    log.push('ℹ 没有新的改动，跳过 commit');
  }

  const push = runGit(['push', '-u', 'origin', 'HEAD'], { cwd: memoryDir, inputUser: identity, timeout: PUSH_TIMEOUT });
  if (push.failed) {
    // 远端已有内容（如换机器/手动推过）时先合并再推
    const pull = runGit(['pull', '--rebase', 'origin', 'HEAD'], { cwd: memoryDir, timeout: PUSH_TIMEOUT });
    if (pull.failed) throw new Error(`推送失败：${push.err || push.out}`);
    const retry = runGit(['push', '-u', 'origin', 'HEAD'], { cwd: memoryDir, timeout: PUSH_TIMEOUT });
    if (retry.failed) throw new Error(`推送失败：${retry.err || retry.out}`);
    log.push('✔ 远端有更新，已 rebase 合并后推送成功');
  } else {
    log.push('✔ 已推送到备份仓库');
  }

  return { pushed: true, committed, message: msg, log };
}

module.exports = { gitOk, status, initRepo, commitAndPush };
