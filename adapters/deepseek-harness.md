# DeepSeek Harness（dsh）接入

## 定位

dsh 通过项目根目录的 `AGENTS.md`（或等价的项目说明文件）获取项目约定。
AMM 的策略：把记忆纪律写进 AGENTS.md，让 dsh 每次会话自动读到 `.memory/` 的读写规则。

## 记忆挂载方式

| 项 | 值 |
|---|---|
| 项目约定文件 | `AGENTS.md`（项目根目录） |
| 技能目录（视版本支持） | `.dsh/skills/shared-memory/` |
| 私有记忆目录 | `~/.dsh/memories/`（若存在，仅本机缓存） |
| 真相来源 | 项目 `.memory/` |

## 接入步骤

```bash
cd your-project

# 1. 创建 .memory/ 并写入 AGENTS.md 记忆纪律段落
amm init --with-agents-md

# 2. 打印 dsh 的挂载指引（含技能源路径）
amm adapt --agent dsh
```

若你的 dsh 版本支持技能目录，按打印出的指引复制技能：

```bash
mkdir -p .dsh/skills
cp -r <AMM仓库>/skills/shared-memory .dsh/skills/shared-memory
```

## 会话内提示词（可选，加速生效）

在 dsh 会话开头附加一句：

```text
请遵守项目 AGENTS.md 中的「项目共享记忆」纪律：开工先读 .memory/，
收工更新 .memory/current-status.md，交接用 amm handoff。
```

## 与私有记忆的关系

- dsh 私有记忆只是缓存 / 草稿，不是真相来源
- 重要内容必须同步进 `.memory/`；冲突时以 `.memory/` 为准

## 降级方案

不支持技能目录时，纯文件读写即可：AGENTS.md 已包含读写纪律，
dsh 只需按 `.memory/README.md` 的规则读写 Markdown 文件，无需任何工具支持。
