# Agent Memory Manager（AMM）

> **One memory. Every agent.**
> 在项目里初始化一次，Codex、DeepSeek Harness（dsh）、ZCode、Grok 等所有编程智能体读写同一份决策、踩坑、约定与进度。

[![CI](https://github.com/ToMySoul/agent-memory-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/ToMySoul/agent-memory-manager/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 为什么需要 AMM？

每个智能体都有自己的私有记忆：Codex 写 `~/.codex/memories/`，ZCode、Grok 各有各的……
结果就是：Codex 踩过的坑，ZCode 再踩一遍；换一个 Agent 接手，上下文全部丢失。

AMM 像 [Skills Manager](docs/comparison-with-skills-manager.md) 统一管理 SKILL.md 一样，统一管理「项目记忆」：

- **一份真相**：项目内 `.memory/` 是唯一真相来源（Single Source of Truth），被 Git 追踪
- **多端挂载**：通过 Skill + AGENTS.md 让各智能体遵守同一套读写纪律，不改智能体源码
- **CLI 管理**：`init / validate / status / handoff / sync / adapt`
- **可视化界面**：`amm ui` 启动本地 Web 管理界面（深色主题，见[界面使用](#界面使用)）
- **零强制依赖**：不强制 Docker、不强制向量库、不强制云服务；记忆全部是 Markdown；纯 Node.js 无第三方依赖
- **可选增强**：可挂 MCP 语义记忆，默认不用也能完整工作（见 [docs/mcp-optional.md](docs/mcp-optional.md)）

## 快速开始（3 步）

### 安装（任选其一）

**方式 A：桌面免安装版（最省事，推荐）**

从 [Releases](https://github.com/ToMySoul/agent-memory-manager/releases) 下载对应平台的单文件程序：

- Windows：`amm-windows-x64.exe` —— **双击直接打开 Web 界面**（也可在终端里当 CLI 用：`amm.exe init` 等）
- macOS（Apple Silicon）：`amm-macos-arm64`；macOS（Intel）：`amm-macos-x64` —— 首次执行 `chmod +x amm-macos-*`

无需安装 Node.js，模板 / 技能 / 界面全部内嵌在单个文件里。

**方式 B：npm 安装（需要 Node.js ≥ 16）**

```bash
npm install -g github:ToMySoul/agent-memory-manager
# 或：git clone https://github.com/ToMySoul/agent-memory-manager.git
#     cd agent-memory-manager && npm install -g .
```

### 初始化你的项目

```bash
cd your-project
amm init --with-agents-md

# 日常使用
amm status                                        # 查看记忆概览
amm handoff "完成登录模块联调" --from codex --to dsh  # 跨智能体交接
amm ui                                            # 打开本地 Web 界面
```

初始化后，把 `.memory/` 与 `AGENTS.md` 提交进 Git，之后任何智能体（以及人）都遵守同一份记忆。

## 命令

| 命令 | 说明 |
|---|---|
| `amm init [--force] [--with-agents-md]` | 创建 `.memory/` 骨架；`--force` 只补全缺失/空文件，绝不删除已有内容 |
| `amm validate` | 校验结构与条目格式；输出 OK / WARN / ERROR，有 ERROR 时退出码非 0 |
| `amm status` | 概览：各文件行数与条目数、最近交接、current-status 摘要 |
| `amm handoff "<一句话摘要>" [--from] [--to]` | 生成 `handoffs/YYYY-MM-DD_HHMM_<slug>.md` 交接记录 |
| `amm sync [--dir <path>]` | 扫描私有记忆（默认 `~/.codex/memories/`），列出最近文件并给出回填建议（不自动改写） |
| `amm adapt --agent codex,dsh,zcode,grok` | 为各智能体写入 / 打印挂载说明；`--dry-run` 只打印 |
| `amm ui [--port 8787] [--project <path>] [--no-open]` | 启动本地 Web 管理界面（仅监听 127.0.0.1） |

所有命令支持 `-h` 查看中文帮助；`amm --help` 查看全局帮助。

## 界面使用

`amm ui` 是 CLI 的可视化层：数据真相仍是项目内 `.memory/`（可被 Git 追踪），文件格式与 CLI 完全一致，可交替使用。

```bash
amm ui                          # 启动并自动打开 http://127.0.0.1:8787
amm ui --port 9000 --project D:/workspace/my-app   # 指定端口与项目
amm ui --no-open                # 不自动打开浏览器
```

- **纯本地**：仅监听 `127.0.0.1`，只读写你选中的项目目录；无登录、无云端、无数据库
- **界面偏好**：保存在 `~/.amm/ui-state.json`；记忆数据永远只存在项目 `.memory/` 里

### 页面一览

| 页面 | 功能 |
|---|---|
| Dashboard | 项目路径、初始化状态、四类记忆计数、状态摘要（有/无阻塞）、最近 5 条交接、快捷操作 |
| 记忆库 | decisions / gotchas / conventions / current-status 卡片；条目列表（日期 / agent / 摘要 / 影响范围）、详情抽屉、新建条目（追加写入对应 md） |
| 交接 | `.memory/handoffs/` 列表（按时间倒序）、详情渲染、表单新建交接（与 `amm handoff` 同一模板与命名） |
| 同步 / 挂载 | 检测 Codex / ZCode / DeepSeek Harness / Grok 的挂载状态（AGENTS.md 段落、技能目录、私有记忆目录）；一键写入 AGENTS.md、安装技能到项目、复制挂载说明、渲染 adapters 文档 |
| 备份 | **Git 备份仓库**（`.memory/` 独立成私有仓库，一键提交并推送，借鉴 Skills Manager「一份原件 + 同步」；适合开源项目工作区——记忆不混入开源代码）＋ zip 导出；结构校验（等同 `amm validate`） |
| 设置 | 主题（深色固定 / 跟随系统）、默认 Agent 列表、最近项目数量、语言 |

左侧栏可切换 Agent 视角（只看某个 agent 的记录）与项目工作区（最近项目 / 打开项目…）；顶栏提供全文搜索（跨 `.memory/` 所有 md）与「＋ 新建」快捷入口。

### 从源码构建界面（开发者）

```bash
npm run build:ui   # 构建 src/ui/client/dist（发布包已内置构建产物）
npm run dev:ui     # 前端热更新开发模式（代理到本地 amm ui）
```

### 验收要点

1. `amm ui` 启动并打开页面
2. 左侧「打开项目…」选择本地目录；未初始化时可在 Dashboard 一键初始化
3. 记忆库新建条目 → 检查 `.memory/*.md` 确实追加（格式与 CLI 一致）
4. 交接页新建 handoff → 检查 `.memory/handoffs/YYYY-MM-DD_HHMM_<slug>.md`
5. 刷新浏览器后数据仍在（读的就是文件）

## `.memory/` 结构

```
.memory/
├── decisions.md        # 重要决策：选型、架构取舍、方向变更
├── gotchas.md          # 踩坑与已知问题
├── conventions.md      # 命名、结构、风格约定
├── current-status.md   # 当前进度、阻塞与下一步
├── README.md           # 纪律说明
└── handoffs/           # 跨智能体交接记录
```

条目格式（decisions / gotchas / conventions 通用）：

```markdown
### YYYY-MM-DD | agent:<name> | 一句话摘要
- 详情：
- 影响范围：
- 相关路径：
```

### 读写纪律（写入 SKILL.md 与 AGENTS.md，所有智能体必须遵守）

- **任务开始前**：读 `current-status.md`、`decisions.md`、`conventions.md`（建议再读 `gotchas.md`）
- **任务结束后**：更新 `current-status.md`；有新决策 / 踩坑 / 约定则写入对应文件
- **跨智能体交接**：`amm handoff "<摘要>" --from <a> --to <b>`，或按模板手写 `handoffs/`
- **禁止**只写在各智能体私有记忆目录而不同步到 `.memory/`

完整规范见 [`packages/spec/`](packages/spec/)。

## 各智能体接入

### Codex（OpenAI Codex CLI）

```bash
amm init --with-agents-md
amm adapt --agent codex   # 实际写入：合并 AGENTS.md + 复制技能到 .agents/skills/shared-memory
amm validate && amm status
```

详见 [adapters/codex.md](adapters/codex.md)。

### DeepSeek Harness（dsh）

```bash
amm init --with-agents-md
amm adapt --agent dsh     # 打印技能源/目标路径与配置片段
```

dsh 通过 AGENTS.md 读取纪律；版本支持技能目录时可复制 `skills/shared-memory` 到 `.dsh/skills/`。
详见 [adapters/deepseek-harness.md](adapters/deepseek-harness.md)。

### ZCode

```bash
amm init --with-agents-md
amm adapt --agent zcode   # 打印挂载指引（AGENTS.md + 项目级技能目录/插件）
```

详见 [adapters/zcode.md](adapters/zcode.md)。

### Grok / 其他智能体

```bash
amm init --with-agents-md
amm adapt --agent grok
```

AGENTS.md 是通用兜底：任何支持 `AGENTS.md` 或 `SKILL.md` 的智能体都能零成本接入。
详见 [adapters/grok.md](adapters/grok.md)。

### 技能单独安装

`skills/shared-memory/SKILL.md` 是标准智能体技能，可直接复制到：

- Codex：`.agents/skills/shared-memory/`
- Claude：`.claude/skills/shared-memory/`
- 或运行 `scripts/install.sh --skill`（Linux/macOS）

## 与私有记忆的关系

- 私有记忆（如 `~/.codex/memories/`）= 本机缓存 / 草稿，**不是**真相来源
- 冲突时，以项目 `.memory/` 为准
- `amm sync` 帮你发现遗留在私有记忆里的决策 / 踩坑，并给出回填建议（只打印，不自动改写）

## 与 Skills Manager 的对应

| Skills Manager | Agent Memory Manager |
|----------------|----------------------|
| SKILL.md | `.memory/*.md` |
| `~/.agents_skills` 原件 | 项目 `.memory/` 原件 |
| 软链接到各 Agent skills 目录 | Skill + AGENTS.md + adapt 挂载 |
| install / sync / lint | `init` / `sync` / `validate` |
| 注册表（可选） | 模板库（本仓库 `templates/`） |

更多见 [docs/comparison-with-skills-manager.md](docs/comparison-with-skills-manager.md)。

## 仓库结构

```
agent-memory-manager/
├── bin/amm                  # CLI 入口
├── src/                     # CLI 实现（纯 Node.js，零依赖）
│   ├── cli.js
│   ├── commands/            # init / validate / status / handoff / sync / adapt / ui
│   ├── lib/                 # layout / templates / agents / memory（CLI 与 UI 共用读写库）/ zip
│   └── ui/
│       ├── server/          # 本地 API（无框架，仅 Node http）+ 状态持久化
│       └── client/          # React + Vite 前端（构建产物随包发布）
├── packages/spec/           # 记忆规范（布局、条目格式、适配注册表）
├── templates/project-memory/# .memory/ 初始骨架（唯一模板来源）
├── skills/shared-memory/    # 标准技能：读写纪律
├── adapters/                # codex / dsh / zcode / grok 接入文档
├── docs/                    # 架构、对比、MCP 可选说明
├── scripts/install.sh       # 安装脚本
└── test/                    # smoke.js（CLI）+ ui-api.js（界面 API 全链路）
```

## 开发与测试

```bash
git clone https://github.com/ToMySoul/agent-memory-manager.git
cd agent-memory-manager
npm install            # 仅安装前端构建依赖（src/ui/client）
npm test               # CLI 冒烟测试 + UI API 全链路测试
npm run build:ui       # 重新构建前端（改过 src/ui/client 后）
```

要求 Node.js ≥ 16；运行时零第三方依赖（构建期仅前端工具链）。

## License

[MIT](LICENSE) © 2026 ToMySoul

- 版本记录：[CHANGELOG.md](CHANGELOG.md)
- 贡献指南：[CONTRIBUTING.md](CONTRIBUTING.md)
- 安全政策：[SECURITY.md](SECURITY.md)
