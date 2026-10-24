#!/usr/bin/env node
'use strict';

/**
 * 构建 AMM 单文件可执行程序（Node SEA）：
 *   amm.exe（Windows）/ amm（macOS）—— 双击即开界面，无需安装 Node。
 *
 * 步骤：
 *   1. esbuild 把 bin/amm 及全部 src 打成单文件 CJS（运行时零依赖，天然可打）
 *   2. 收集资源（templates/ skills/ adapters/ 前端 dist/ package.json）→ manifest.json + SEA 资产
 *   3. node --experimental-sea-config 生成 blob
 *   4. 复制 node 可执行文件，postject 注入 → build/amm[.exe]
 *
 * 用法：node scripts/build-sea.mjs        （在仓库根执行；需先 npm run build:ui）
 * 产物：build/amm-windows-x64.exe 或 build/amm-macos-<arch>
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, 'build');

const PLATFORM = process.platform === 'win32' ? 'windows' : 'macos';
const ARCH = process.arch; // x64 / arm64
const EXE_NAME = PLATFORM === 'windows' ? `amm-${PLATFORM}-${ARCH}.exe` : `amm-${PLATFORM}-${ARCH}`;

function log(msg) {
  console.log(`[build-sea] ${msg}`);
}
function run(cmd, args, opts = {}) {
  execFileSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
}

// ---------- 1. esbuild 打包 ----------
const bundle = path.join(BUILD, 'bundle.cjs');
run('node', [
  'node_modules/esbuild/bin/esbuild',
  'bin/amm',
  '--bundle', '--platform=node', '--format=cjs',
  '--target=node20',
  `--outfile=${bundle}`,
]);
log(`已打包 CLI → ${path.relative(ROOT, bundle)}`);

// ---------- 2. 收集资源 ----------
const ASSET_DIRS = ['templates', 'skills', 'adapters', 'src/ui/client/dist'];
const assets = {};
const files = [];

for (const dir of ASSET_DIRS) {
  const absDir = path.join(ROOT, dir);
  if (!fs.existsSync(absDir)) {
    throw new Error(`缺少目录 ${dir}（前端产物请先执行 npm run build:ui）`);
  }
  (function walk(d, rel) {
    for (const f of fs.readdirSync(d)) {
      const abs = path.join(d, f);
      const r = rel ? `${rel}/${f}` : f;
      if (fs.statSync(abs).isDirectory()) walk(abs, r);
      else {
        assets[r] = abs;
        files.push(r);
      }
    }
  })(absDir, dir);
}
assets['package.json'] = path.join(ROOT, 'package.json');
files.push('package.json');

fs.writeFileSync(path.join(BUILD, 'manifest.json'), JSON.stringify({ files }, null, 2));
assets['manifest.json'] = path.join(BUILD, 'manifest.json');
log(`已收集 ${files.length} 个资源文件（模板/技能/文档/前端产物）`);

// ---------- 3. SEA 配置与 blob ----------
const seaConfig = path.join(BUILD, 'sea-config.json');
fs.writeFileSync(seaConfig, JSON.stringify({
  main: bundle,
  output: path.join(BUILD, 'sea-prep.blob'),
  disableExperimentalSEAWarning: true,
  useSnapshot: false,
  useCodeCache: false,
  assets,
}, null, 2));

run(process.execPath, ['--experimental-sea-config', seaConfig]);
log('已生成 SEA blob');

// ---------- 4. 注入可执行文件 ----------
const exe = path.join(BUILD, EXE_NAME);
fs.copyFileSync(process.execPath, exe);

if (PLATFORM === 'windows') {
  // 尽力移除 node.exe 签名（无 signtool 时 postject --sentinel 也能注入，产物未签名）
  try {
    run('signtool', ['remove', '/s', exe]);
    log('已移除原签名');
  } catch {
    log('未找到 signtool，跳过签名移除（产物将不带签名）');
  }
} else {
  try {
    run('codesign', ['--remove-signature', exe]);
    log('已移除原签名');
  } catch {
    log('跳过签名移除');
  }
}

run('node', [
  'node_modules/postject/dist/cli.js',
  exe,
  'NODE_SEA_BLOB',
  path.join(BUILD, 'sea-prep.blob'),
  '--sentinel-fuse', 'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
]);
log(`✔ 构建完成：${exe}`);
log(`  体积：${(fs.statSync(exe).size / 1024 / 1024).toFixed(1)} MB`);
