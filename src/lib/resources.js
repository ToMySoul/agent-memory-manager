'use strict';

/**
 * 资源读取抽象：同一段代码在两种形态下都能工作。
 *  - 普通安装（npm / git clone）：从仓库目录读文件
 *  - 单文件可执行（Node SEA，scripts/build-sea.mjs 产物）：从内嵌资产读取
 * 资源 = 模板 templates/、技能 skills/、适配文档 adapters/、前端构建产物 src/ui/client/dist/、package.json
 * 资产键统一使用相对仓库根的正斜杠路径（构建时由 manifest.json 提供目录清单）。
 */

const fs = require('fs');
const path = require('path');

let sea = null;
try {
  sea = require('node:sea');
} catch {
  /* 非 SEA 环境（普通 Node 运行） */
}

const IS_SEA = !!(sea && typeof sea.isSea === 'function' && sea.isSea());
const PKG_ROOT = path.resolve(__dirname, '..', '..');

let manifestCache = null;

function manifest() {
  if (!IS_SEA) return null;
  if (!manifestCache) {
    manifestCache = JSON.parse(Buffer.from(sea.getAsset('manifest.json')).toString('utf8'));
  }
  return manifestCache;
}

function isSea() {
  return IS_SEA;
}

/** 读取资源文件，返回 Buffer；rel 为相对仓库根的路径（正斜杠或平台分隔符均可） */
function readResource(rel) {
  const key = String(rel).replace(/\\/g, '/');
  if (IS_SEA) return Buffer.from(sea.getAsset(key));
  return fs.readFileSync(path.join(PKG_ROOT, key));
}

function resourceExists(rel) {
  try {
    readResource(rel);
    return true;
  } catch {
    return false;
  }
}

/** 列出某资源目录下的文件名（不含子目录递归）。SEA 下依据内嵌 manifest。 */
function listResourceDir(relDir) {
  const key = String(relDir).replace(/\\/g, '/').replace(/\/+$/, '');
  if (IS_SEA) {
    const prefix = key + '/';
    return (manifest().files || []).filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes('/'));
  }
  return fs.readdirSync(path.join(PKG_ROOT, key)).filter((f) => fs.statSync(path.join(PKG_ROOT, key, f)).isFile());
}

module.exports = { isSea, readResource, resourceExists, listResourceDir, PKG_ROOT };
