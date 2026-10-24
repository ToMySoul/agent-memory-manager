'use strict';

/**
 * UI 会话状态（当前项目 / 最近项目 / 设置），持久化到 ~/.amm/ui-state.json。
 * 记忆数据本身仍在项目 .memory/（真相来源），这里只存 UI 偏好。
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.homedir(), '.amm');
const STATE_FILE = process.env.AMM_STATE_FILE || path.join(STATE_DIR, 'ui-state.json');

const DEFAULT_STATE = {
  currentProject: null,
  recentProjects: [], // [{ path, name, openedAt }]
  settings: {
    theme: 'dark', // 'dark' | 'system'
    defaultAgents: ['codex', 'dsh', 'zcode', 'grok'],
    recentLimit: 8,
    language: 'zh-CN',
  },
};

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return {
      ...DEFAULT_STATE,
      ...raw,
      settings: { ...DEFAULT_STATE.settings, ...(raw.settings || {}) },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_STATE));
  }
}

function save(state) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

/** 打开项目：设为当前 + 记入最近列表（去重、置顶、按上限截断） */
function openProject(state, dir) {
  const abs = path.resolve(dir);
  const name = path.basename(abs) || abs;
  state.currentProject = abs;
  state.recentProjects = [
    { path: abs, name, openedAt: new Date().toISOString() },
    ...state.recentProjects.filter((p) => p.path !== abs),
  ].slice(0, Math.max(1, state.settings.recentLimit));
  save(state);
  return state;
}

module.exports = { STATE_FILE, load, save, openProject };
