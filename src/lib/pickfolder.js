'use strict';

/**
 * 系统选择弹窗（异步，不阻塞 API 服务器）：
 *   pickFolder()      选择一个目录
 *   pickFiles()       选择一个或多个文件（用于「选文件定位项目目录」）
 *
 * Windows 实现要点（踩过的坑，改动前请先理解）：
 *   - 脚本写入临时 .ps1 文件再以 -File 执行：内嵌 -Command 会经过多层命令行
 *     转义，C# Add-Type 的引号会被 PowerShell 解析坏，导致脚本静默失败
 *   - 必须有「可见宿主窗体 + SetForegroundWindow + ALT 键模拟」：后台进程直接
 *     ShowDialog 会创建不可见的对话框（窗口存在但永不显示），用户完全看不到
 */

const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TIMEOUT_MS = 10 * 60 * 1000; // 用户可能慢慢挑，给足时间

/** 生成 Windows 选择器 .ps1 脚本内容 */
function winPickerScript(mode) {
  const isFolder = mode === 'folder';
  return `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class FG {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);
}
'@

# 可见（透明、离屏）宿主窗体：让对话框有归属并抢到前台
$o = New-Object System.Windows.Forms.Form
$o.Text = 'AMM'
$o.ShowInTaskbar = $false
$o.Opacity = 0
$o.Size = New-Object System.Drawing.Size(1, 1)
$o.StartPosition = 'Manual'
$o.Location = New-Object System.Drawing.Point(-3000, -3000)
$o.Show() | Out-Null
# ALT 键模拟绕过前台锁（Windows 只允许「刚接收过用户输入」的进程进前台）
[FG]::keybd_event(0x12, 0, 0, [UIntPtr]::Zero)
[FG]::keybd_event(0x12, 0, 2, [UIntPtr]::Zero)
[FG]::SetForegroundWindow($o.Handle) | Out-Null
$o.Activate() | Out-Null

try {
  ${
  isFolder
    ? `$d = New-Object System.Windows.Forms.FolderBrowserDialog
     $d.Description = '选择 AMM 要管理的项目目录'
     $r = $d.ShowDialog($o)
     $out = if ($r -eq [System.Windows.Forms.DialogResult]::OK) { $d.SelectedPath } else { $null }`
    : `$d = New-Object System.Windows.Forms.OpenFileDialog
     $d.Title = '选择项目内的任意文件（取所在目录为项目，可多选）'
     $d.Filter = '所有文件|*.*'
     $d.Multiselect = $true
     $r = $d.ShowDialog($o)
     $out = if ($r -eq [System.Windows.Forms.DialogResult]::OK) { $d.FileNames -join [char]10 } else { $null }`
}
} finally {
  $o.Close()
}
if ($out) { [Console]::Out.Write($out) }
`.trim();
}

function runScript(cmd, args, parse) {
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

function winPick(mode) {
  const scriptPath = path.join(os.tmpdir(), `amm-picker-${mode}-${process.pid}.ps1`);
  try {
    // 必须带 UTF-8 BOM：Windows PowerShell 5.1 对无 BOM 脚本按 ANSI/GBK 解析，
    // 脚本里的中文会被读成乱码、吞掉后续语句导致静默失败
    fs.writeFileSync(scriptPath, '\ufeff' + winPickerScript(mode), 'utf8');
  } catch (e) {
    return Promise.resolve({ error: `无法写入临时脚本：${e.message}` });
  }
  return runScript(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-STA', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
    (code, out, err) => {
      try { fs.unlinkSync(scriptPath); } catch { /* 临时文件清理失败不影响 */ }
      if (mode === 'folder') {
        const p = out.trim().replace(/"/g, '');
        if (code === 0 && p) return { path: p };
        if (err) return { error: `选择器出错：${err.trim().split(/\r?\n/)[0]}` };
        return { canceled: true };
      }
      const paths = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (code === 0 && paths.length) return { paths };
      if (err) return { error: `选择器出错：${err.trim().split(/\r?\n/)[0]}` };
      return { canceled: true };
    }
  );
}

function trimPath(p) {
  return p.trim().replace(/"/g, '').replace(/\/+$/, (m) => (m.length > 1 ? '' : m));
}

function pickFolder() {
  if (process.platform === 'win32') return winPick('folder');
  if (process.platform === 'darwin') {
    return runScript('osascript', ['-e', 'tell application "System Events" to return POSIX path of (choose folder with prompt "选择 AMM 要管理的项目目录")'], (code, out) => {
      const p = trimPath(out);
      if (code === 0 && p) return { path: p };
      return { canceled: true };
    });
  }
  return runScript('zenity', ['--file-selection', '--directory', '--title=选择 AMM 要管理的项目目录'], (code, out) => {
    const p = trimPath(out);
    if (code === 0 && p) return { path: p };
    return { canceled: true };
  });
}

function pickFiles() {
  if (process.platform === 'win32') return winPick('file');
  if (process.platform === 'darwin') {
    return runScript('osascript', ['-e', 'set fs to choose file with multiple selections allowed with prompt "选择项目内的任意文件（可多选）"', '-e', 'set out to ""', '-e', 'repeat with f in fs', '-e', 'set out to out & POSIX path of f & linefeed', '-e', 'end repeat', '-e', 'return out'], (code, out) => {
      const paths = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      if (code === 0 && paths.length) return { paths };
      return { canceled: true };
    });
  }
  return runScript('zenity', ['--file-selection', '--multiple', '--separator=\n', '--title=选择项目内的任意文件（可多选）'], (code, out) => {
    const paths = out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    if (code === 0 && paths.length) return { paths };
    return { canceled: true };
  });
}

module.exports = { pickFolder, pickFiles, winPickerScript };
