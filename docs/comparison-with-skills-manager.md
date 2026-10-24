# 与 Skills Manager 的对应关系

AMM 的产品模式完全照搬 Skills Manager：**一份原件 + 多端挂载 + CLI 管理**，
只是管理对象从「技能（SKILL.md）」换成了「项目记忆（.memory/）」。

| Skills Manager | Agent Memory Manager |
|----------------|----------------------|
| SKILL.md | `.memory/*.md` |
| `~/.agents_skills` 原件 | 项目 `.memory/` 原件 |
| 软链接到各 Agent skills 目录 | Skill + AGENTS.md + `amm adapt` 挂载 |
| install / sync / lint | `amm init` / `amm sync` / `amm validate` |
| 注册表（可选） | 模板库（本仓库 `templates/`） |

## 命令级对照

| Skills Manager 操作 | AMM 等价操作 |
|---|---|
| 安装技能到仓库 | `amm init`（初始化记忆骨架） |
| 分发 / 挂载到各 Agent | `amm adapt --agent codex,dsh,zcode,grok` |
| lint 检查技能格式 | `amm validate`（结构 + 条目格式） |
| 同步各端 | `amm sync`（从私有记忆回收建议） |
| ——（无对应） | `amm handoff`（跨智能体交接） |
| ——（无对应） | `amm status`（记忆概览） |

## 关键差异

1. **作用域**：Skills Manager 的原件在用户全局目录（跨项目共享技能）；AMM 的原件在**项目内**
   （记忆天然属于项目，随 Git 走、随 PR 评审）。
2. **挂载机制**：Skills Manager 用软链接；AMM 不要求文件系统链接，而是
   「复制 Skill + 合并 AGENTS.md 段落」双保险——因为智能体读取记忆的方式是读文件内容，
   而不是扫描某个 skills 目录。
3. **写入方向**：技能是只读资产；记忆是**读写**资产，所以 AMM 额外定义了读写纪律
   （何时读、写到哪、交接流程），并靠 SKILL.md + AGENTS.md 让智能体自觉遵守。
4. **冲突策略**：技能冲突表现为链接覆盖；记忆冲突表现为内容冲突，AMM 规定
   「追加不改写、`.memory/` 优先于私有记忆」，由 Git 负责最终合并。

## 两者可以并用

Skills Manager 管「智能体会什么」（技能），AMM 管「项目知道什么」（记忆）。
在同一个项目里同时使用完全兼容：技能教 Agent 如何工作，`.memory/` 记录这个项目的一切约定与进度。
