# Codex（OpenAI Codex CLI）接入

## 记忆挂载方式

| 项 | 值 |
|---|---|
| 项目约定文件 | `AGENTS.md`（项目根目录） |
| 技能目录 | `.agents/skills/<skill-name>/SKILL.md` |
| 私有记忆目录 | `~/.codex/memories/`（仅本机缓存，不进 Git） |
| 真相来源 | 项目 `.memory/` |

## 接入步骤

```bash
cd your-project

# 1. 创建 .memory/ 并写入 AGENTS.md 记忆纪律段落
amm init --with-agents-md

# 2. 挂载技能（合并 AGENTS.md + 复制 skills/shared-memory → .agents/skills/shared-memory）
amm adapt --agent codex

# 3. 验证
amm validate && amm status
```

完成后把 `.memory/`、`AGENTS.md`、`.agents/` 一起提交进 Git。

## 等价的手工操作

```bash
# AGENTS.md 段落（幂等，marker 包裹）
amm init --with-agents-md

# 技能复制
mkdir -p .agents/skills
cp -r <AMM仓库>/skills/shared-memory .agents/skills/shared-memory
```

## 与私有记忆的关系

- Codex 私有记忆（`~/.codex/memories/`）只是本机缓存 / 草稿，**不是**真相来源
- 重要内容必须同步进 `.memory/`；`amm sync` 可扫描该目录并给出回填建议
- 内容冲突时，以 `.memory/` 为准

## 降级方案

若你的 Codex 版本不支持 `.agents/skills/`，仅保留 AGENTS.md 段落即可——
读写纪律写在 AGENTS.md 中，Codex 每次会话都会读到，效果等同于技能。
