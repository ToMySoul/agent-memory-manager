'use strict';

/**
 * 系统选择弹窗（异步，不阻塞 API 服务器）：
 *   pickFolder()      选择一个目录
 *   pickFiles()       选择一个或多个文件（用于「选文件定位项目目录」）
 * 平台实现：
 *   Windows: PowerShell WinForms（TopMost 宿主窗体，避免弹窗被压在后台）
 *   macOS:   osascript choose folder / choose file
 *   Linux:   zenity
 * 返回 Promise<{ path } | { paths } | { canceled: true } | { error }>
 */

const { spawn } = require('child_process');

const TIMEOUT_MS = 10 * 60 * 1000; // 用户可能慢慢挑，给足时间

function runPicker(cmd, args, parse) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    } catch (e) {
      resolve({ error: `无法启动选择器：${e.message}` });
      return;
    }
    let out = '';
    let err = '';
    const timer = setTimeout(() => {
      try { child.kill(); } catch { /* 已退出 */ }
      resolve({ error: '选择窗口超时未响应' });
    }, TIMEOUT_MS);

    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', (e) => {
      clearTimeout(timer);
      resolve({ error: `无法启动选择器：${e.message}` });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        resolve(parse(code, out, err));
      } catch (e) {
        resolve({ error: `解析选择结果失败：${e.message}` });
      }
    });
  });
}

function trimPath(p) {
  return p.trim().replace(/"/g, '').replace(/\/+$/, (m) => (m.length > 1 ? '' : m));
}

/** Windows PowerShell 脚本：TopMost 宿主窗体确保弹窗在最前 */
function winScript(mode) {
  const owner = "$o = New-Object System.Windows.Forms.Form; $o.TopMost = $true; $o.MinimizeBox = $false; $o.MaximizeBox = $false";
  if (mode === 'folder') {
    return [
      'Add-Type -AssemblyName System.Windows.Forms | Out-Null',
      owner,
      "$d = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$d.Description = '选择 AMM 要管理的项目目录'",
      "if ($d.ShowDialog($o) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }",
    ].join('; ');
  }
  return [
    'Add-Type -AssemblyName System.Windows.Forms | Out-Null',
    owner,
    "$d = New-Object System.Windows.Forms.OpenFileDialog",
    "$d.Title = '选择项目内的任意文件（取所在目录为项目，可多选）'",
    "$d.Filter = '所有文件|*.*'",
    '$d.Multiselect = $true',
    "if ($d.ShowDialog($o) -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write(($d.FileNames -join [char]10)) }",
  ].join('; ');
}

function pickFolder() {
  if (process.platform === 'win32') {
    return runPicker('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', winScript('folder')], (code, out) => {
      const p = trimPath(out);
      if (code === 0 && p) return { path: p };
      return { canceled: true };
    });
  }
  if (process.platform === 'darwin') {
    return runPicker('osascript', ['-e', 'tell application "System Events" to return POSIX path of (choose folder with prompt "选择 AMM 要管理的项目目录")'], (code, out) => {
      const p = trimPath(out);
      if (code === 0 && p) return { path: p };
      return { canceled: true };
    });
  }
  return runPicker('zenity', ['--file-selection', '--directory', '--title=选择 AMM 要管理的项目目录'], (code, out) => {
    const p = trimPath(out);
    if (code === 0 && p) return { path: p };
    return { canceled: true };
  });
}

function pickFiles() {
  if (process.platform === 'win32') {
    return runPicker('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', winScript('file')], (code, out) => {
      const paths = out.split(/\r?\n|\n/).map((s) => s.trim()).filter(Boolean);
      if (code === 0 && paths.length) return { paths };
      return { canceled: true };
    });
  }
  if (process.platform === 'darwin') {
    return runPicker('osascript', ['-e', 'set fs to choose file with multiple selections allowed with prompt "选择项目内的任意文件（可多选）"', '-e', 'set out to ""', '-e', 'repeat with f in fs', '-e', 'set out to out & POSIX path of f & linefeed', '-e', 'end repeat', '-e', 'return out'], (code, out) => {
      const paths = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (code === 0 && paths.length) return { paths };
      return { canceled: true };
    });
  }
  return runPicker('zenity', ['--file-selection', '--multiple', '--separator=\n', '--title=选择项目内的任意文件（可多选）'], (code, out) => {
    const paths = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (code === 0 && paths.length) return { paths };
    return { canceled: true };
  });
}

module.exports = { pickFolder, pickFiles };
