# 记忆布局规范（memory-layout）

> 版本：1 ｜ 规范仓库：[agent-memory-manager](https://github.com/ToMySoul/agent-memory-manager)
> 本文件定义项目共享记忆目录 `.memory/` 的布局。`amm init` / `amm validate` 实现本规范。

## 1. 位置与追踪

- 唯一真相来源：项目根目录下的 `.memory/`
- **必须**被 Git 追踪（禁止加进 `.gitignore`）
- 项目 `.memory/` 优先级高于任何智能体私有记忆（如 `~/.codex/memories/`）

## 2. 必需结构

```
.memory/
├── decisions.md        # 重要决策：选型、架构取舍、方向变更
├── gotchas.md          # 踩坑与已知问题
├── conventions.md      # 命名、结构、风格约定
├── current-status.md   # 当前进度、阻塞与下一步（每次任务结束更新）
├── README.md           # 纪律说明（给人也给智能体读）
└── handoffs/           # 跨智能体交接记录
    └── _template.md    # 交接模板（以下划线开头，不算交接记录）
```

`amm validate` 规则：

| 检查项 | 级别 |
|---|---|
| `.memory/` 不存在 | ERROR |
| 必需文件 / `handoffs/` 目录缺失 | ERROR |
| 必需文件为空 | WARN |
| 条目格式不规范（见 entry-format.md） | WARN |
| 交接文件名 / from / to 不规范 | WARN |

退出码：存在 ERROR 时为 1，否则 0。

## 3. 允许的扩展

- 可在 `.memory/` 下增加子目录或文件（如 `decisions-arch/`），但**不得**移除或重命名必需项
- 交接记录必须放在 `handoffs/` 下，命名规则见 entry-format.md

## 4. 与智能体的关系

- 智能体**不得**把项目记忆写到 `.memory/` 之外的私有目录了事
- 各智能体通过 Skill（`skills/shared-memory/SKILL.md`）或 AGENTS.md 段落得知本规范
