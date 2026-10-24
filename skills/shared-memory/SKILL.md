---
name: shared-memory
description: >
  多 Agent 统一项目记忆规范。在读写项目决策、踩坑、约定、进度、交接时使用。
  适用于 Codex、DeepSeek Harness、ZCode、Grok 等。触发词：记忆、handoff、决策、.memory、共享记忆。
---

# shared-memory：多 Agent 统一项目记忆

本项目使用 `.memory/` 作为**唯一**的项目记忆真相来源（Single Source of Truth），
所有智能体（Codex、DeepSeek Harness、ZCode、Grok 等）与人共同读写，纳入 Git 追踪。

**优先级规则：项目 `.memory/` 永远优先于任何智能体的私有记忆（如 `~/.codex/memories/`）。**

## 何时必须读

在开始任何编码 / 调试 / 重构任务之前，先读：

1. `.memory/current-status.md` —— 当前进度与阻塞
2. `.memory/decisions.md` —— 既有决策，避免推翻已定事项
3. `.memory/conventions.md` —— 必须遵守的约定
4. `.memory/gotchas.md` —— 已知坑，避免重复踩坑（强烈推荐）

## 何时必须写、写到哪个文件

| 情形 | 目标文件 |
|---|---|
| 做出技术选型 / 架构取舍 / 方向变更 | `decisions.md` 追加条目 |
| 踩坑、发现疑难或已知问题 | `gotchas.md` 追加条目 |
| 确立或修改命名 / 结构 / 风格约定 | `conventions.md` 追加条目 |
| 任务结束（无论成败） | 更新 `current-status.md` |
| 跨智能体交接 / 换 Agent 接手 | 生成 `handoffs/` 交接记录 |

条目格式（decisions / gotchas / conventions 通用）：

```markdown
### YYYY-MM-DD | agent:<name> | 一句话摘要
- 详情：
- 影响范围：
- 相关路径：
```

## handoff 流程

1. 交出方执行：`amm handoff "一句话摘要" --from codex --to dsh`
2. 补全生成文件中的「已完成 / 未完成 / 风险与注意 / 下一步」
3. 接收方开工前先读最新交接文件与 `current-status.md`
4. 无法执行 CLI 时，按 `handoffs/_template.md` 手写同格式文件（文件名 `YYYY-MM-DD_HHMM_<slug>.md`）

## 与各智能体的适配

- 支持 SKILL.md 的智能体：本技能安装后自动生效
- 仅支持 AGENTS.md 的智能体：记忆纪律已写入项目根目录 AGENTS.md（`amm init --with-agents-md`）
- 都不支持时：降级为**纯文件读写**——只要遵守本文件的读写纪律即可，不需要任何工具

各智能体的具体挂载路径见 AMM 仓库 `adapters/` 目录。

## 禁止事项

- 禁止把重要信息只写进智能体私有记忆（如 `~/.codex/memories/`）而不同步到 `.memory/`
- 禁止删除或改写他人条目（追加勘误备注可以）
- 禁止在 `.memory/` 之外另立项目记忆副本
