# `.memory/` — 项目共享记忆

本目录是本项目**唯一**的记忆真相来源（Single Source of Truth），
供 Codex、DeepSeek Harness（dsh）、ZCode、Grok 等所有编程智能体与人共同读写，并通过 Git 追踪。

## 目录结构

| 路径 | 用途 |
|------|------|
| `decisions.md` | 重要决策（选型、架构、方向） |
| `gotchas.md` | 踩坑与已知问题 |
| `conventions.md` | 命名 / 结构 / 风格约定 |
| `current-status.md` | 当前进度、阻塞与下一步 |
| `handoffs/` | 跨智能体交接记录 |

## 条目格式

`decisions.md` / `gotchas.md` / `conventions.md` 中每条记录使用：

```markdown
### YYYY-MM-DD | agent:<name> | 一句话摘要
- 详情：
- 影响范围：
- 相关路径：
```

## 读写纪律

- 任务开始前：读 `current-status.md`、`decisions.md`、`conventions.md`（建议再读 `gotchas.md`）
- 任务结束后：更新 `current-status.md`；有新决策 / 踩坑 / 约定则追加到对应文件
- 跨智能体交接：`amm handoff "<一句话摘要>" --from <agent> --to <agent>`，或按 `handoffs/_template.md` 手写
- 禁止只写入各智能体私有记忆（如 `~/.codex/memories/`）而不同步到本目录

## 工具

- `amm status`：查看记忆概览
- `amm validate`：校验结构与条目格式
- `amm sync`：扫描私有记忆，给出回填建议

规范来源：[Agent Memory Manager](https://github.com/ToMySoul/agent-memory-manager) 的 `packages/spec/`
