'use strict';

/**
 * 系统文件夹选择弹窗（异步，不阻塞 API 服务器）：
 *   Windows: PowerShell FolderBrowserDialog（需 STA）
 *   macOS:   osascript choose folder
 *   Linux:   zenity --file-selection --directory
 * 返回 Promise<{ path } | { canceled: true } | { error }>;不支持时给可手输的提示。
 */

const { spawn } = require('child_process');

const TIMEOUT_MS = 10 * 60 * 1000; // 用户可能慢慢挑，给足时间

function runPicker(cmd, args, parse) {
  return new Promise((resolve) => {
    let child;
    try {
      child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false });
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

function pickFolder() {
  if (process.platform === 'win32') {
    const ps = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "$d = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$d.Description = '选择 AMM 要管理的项目目录'",
      "if ($d.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { [Console]::Out.Write($d.SelectedPath) }",
    ].join('; ');
    return runPicker('powershell.exe', ['-NoProfile', '-NonInteractive', '-STA', '-Command', ps], (code, out) => {
      const p = out.trim();
      if (code === 0 && p) return { path: p };
      return { canceled: true };
    });
  }
  if (process.platform === 'darwin') {
    return runPicker('osascript', ['-e', 'tell application "System Events" to return POSIX path of (choose folder with prompt "选择 AMM 要管理的项目目录")'], (code, out) => {
      const p = out.trim();
      if (code === 0 && p) return { path: p.replace(/\/+$/, '') };
      return { canceled: true };
    });
  }
  return runPicker('zenity', ['--file-selection', '--directory', '--title=选择 AMM 要管理的项目目录'], (code, out) => {
    const p = out.trim();
    if (code === 0 && p) return { path: p };
    return { canceled: true };
  });
}

module.exports = { pickFolder };
