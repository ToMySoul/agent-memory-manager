# Agent Memory Manager（AMM）

> **One memory. Every agent.**
> 在项目里初始化一次，Codex、DeepSeek Harness（dsh）、ZCode、Grok 等所有编程智能体读写同一份决策、踩坑、约定与进度。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 为什么需要 AMM？

每个智能体都有自己的私有记忆：Codex 写 `~/.codex/memories/`，ZCode、Grok 各有各的……
结果就是：Codex 踩过的坑，ZCode 再踩一遍；换一个 Agent 接手，上下文全部丢失。

AMM 像 [Skills Manager](docs/comparison-with-skills-manager.md) 统一管理 SKILL.md 一样，统一管理「项目记忆」：

- **一份真相**：项目内 `.memory/` 是唯一真相来源（Single Source of Truth），被 Git 追踪
- **多端挂载**：通过 Skill + AGENTS.md 让各智能体遵守同一套读写纪律，不改智能体源码
- **CLI 管理**：`init / validate / status / handoff / sync / adapt`
- **零强制依赖**：不强制 Docker、不强制向量库、不强制云服务；记忆全部是 Markdown；纯 Node.js 无第三方依赖
- **可选增强**：可挂 MCP 语义记忆，默认不用也能完整工作（见 [docs/mcp-optional.md](docs/mcp-optional.md)）

## 快速开始（3 步）

```bash
# 1. 安装（任选其一）
npm install -g github:ToMySoul/agent-memory-manager
# 或：git clone https://github.com/ToMySoul/agent-memory-manager.git
#     cd agent-memory-manager && npm install -g .
#     （Linux/macOS 也可用 scripts/install.sh）

# 2. 在你的项目中初始化
cd your-project
amm init --with-agents-md

# 3. 日常使用
amm status                                        # 查看记忆概览
amm handoff "完成登录模块联调" --from codex --to dsh  # 跨智能体交接
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

所有命令支持 `-h` 查看中文帮助；`amm --help` 查看全局帮助。

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
│   ├── commands/            # init / validate / status / handoff / sync / adapt
│   └── lib/                 # layout / templates / agents
├── packages/spec/           # 记忆规范（布局、条目格式、适配注册表）
├── templates/project-memory/# .memory/ 初始骨架（唯一模板来源）
├── skills/shared-memory/    # 标准技能：读写纪律
├── adapters/                # codex / dsh / zcode / grok 接入文档
├── docs/                    # 架构、对比、MCP 可选说明
├── scripts/install.sh       # 安装脚本
└── test/smoke.js            # 冒烟测试
```

## 开发与测试

```bash
git clone https://github.com/ToMySoul/agent-memory-manager.git
cd agent-memory-manager
npm test        # 冒烟测试：在临时目录跑 init/validate/status/handoff/sync/adapt
```

要求 Node.js ≥ 16；无任何 npm 运行时依赖。

## License

[MIT](LICENSE) © 2026 ToMySoul
