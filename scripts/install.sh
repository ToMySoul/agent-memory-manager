#!/usr/bin/env bash
# AMM 安装脚本：全局安装 amm CLI，并可选安装 shared-memory 技能到本机常见 Agent 技能目录。
# 用法：
#   scripts/install.sh            仅安装 CLI
#   scripts/install.sh --skill    安装 CLI + 技能（~/.agents/skills 与 ~/.claude/skills）

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(dirname "$SCRIPT_DIR")"

usage() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//g' | tail -n +2
}

WITH_SKILL=0
for arg in "$@"; do
  case "$arg" in
    --skill) WITH_SKILL=1 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "未知参数：$arg" >&2; usage; exit 1 ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "错误：未找到 node，请先安装 Node.js >= 16（https://nodejs.org）" >&2
  exit 1
fi

echo "==> 安装 amm CLI（全局）..."
npm install -g "$ROOT"

if [ "$WITH_SKILL" = "1" ]; then
  echo "==> 安装 shared-memory 技能..."
  for target in "$HOME/.agents/skills" "$HOME/.claude/skills"; do
    mkdir -p "$target"
    rm -rf "$target/shared-memory"
    cp -r "$ROOT/skills/shared-memory" "$target/shared-memory"
    echo "    已安装 → $target/shared-memory"
  done
fi

echo "==> 验证："
amm --version

echo
echo "安装完成。进入你的项目执行："
echo "  amm init --with-agents-md"
