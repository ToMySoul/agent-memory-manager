# 架构

## 设计原则

1. **一份真相**：项目内 `.memory/` 是唯一真相来源（Single Source of Truth），必须被 Git 追踪
2. **零强制依赖**：不强制 Docker、不强制向量库、不强制云服务；只需 Node.js ≥ 16
3. **文件优先**：记忆全部是 Markdown，人与智能体都可以直接读改
4. **约定优于代码**：不改任何智能体源码，通过 Skill + AGENTS.md 传递读写纪律
5. **渐进增强**：MCP 语义记忆等能力可选挂载（见 [mcp-optional.md](mcp-optional.md)）

## 总体结构

```
+---------------------+     +--------------------------+
| Codex CLI           |     | DeepSeek Harness（dsh）  |
| AGENTS.md + skill   |     | AGENTS.md（+ skill 可选）|
+----------+----------+     +------------+-------------+
           |                             |
           │ 读 / 写（遵守同一纪律）        │
           v                             v
   +------------------------------------------------+
   |        项目 .memory/（Git 追踪，SSOT）           |
   |  decisions.md   gotchas.md   conventions.md     |
   |  current-status.md          handoffs/           |
   +------------------------------------------------+
           ^                             ^
           |                             |
+----------+----------+     +------------+-------------+
| ZCode               |     | Grok / 其他 Agent        |
| AGENTS.md + skill   |     | AGENTS.md（通用兜底）     |
+---------------------+     +--------------------------+

           各智能体私有记忆（如 ~/.codex/memories/）
           ——仅缓存/草稿，amm sync 可扫描并建议回填——>
```

## 模块划分

| 模块 | 职责 |
|---|---|
| `bin/amm` | CLI 入口（shebang Node 脚本） |
| `src/cli.js` | 参数解析（`--flag value` / `--flag=value` / 短项）、命令分发、帮助与版本 |
| `src/commands/*.js` | 六个命令：init / validate / status / handoff / sync / adapt |
| `src/lib/layout.js` | `.memory/` 规范常量、条目解析（跳过代码围栏）、文件名与日期工具 |
| `src/lib/templates.js` | 读取 `templates/project-memory/` 并渲染 `{{VAR}}` 占位符；AGENTS.md 段落 |
| `src/lib/agents.js` | 智能体适配注册表、AGENTS.md 幂等合并、技能复制 |
| `templates/project-memory/` | `.memory/` 初始骨架（唯一模板来源） |
| `skills/shared-memory/` | 标准技能，向各智能体传递读写纪律 |
| `adapters/*.md` | 各智能体接入文档 |
| `packages/spec/` | 记忆规范（布局、条目格式、适配注册表） |

## 命令流水线

```
argv ──> src/cli.js 解析 ──> commands/<cmd>.run({ flags, positionals, cwd })
      ──> lib/layout + lib/templates + lib/agents ──> 本地文件系统
      ──> 退出码（0 正常；validate 有 ERROR 时 1）
```

无守护进程、无网络请求、无第三方 npm 依赖。

## 数据模型

**条目标题**（decisions / gotchas / conventions 通用）：

```
heading   := "### " date "| agent:" name "| " summary
date      := YYYY "-" MM "-" DD
name      := [A-Za-z0-9_.-]+
summary   := 非空文本（一行）
```

**交接文件名**：`YYYY-MM-DD_HHMM_<slug>.md`，slug 由摘要生成（保留中文与字母数字，空白转 `-`）。

**AGENTS.md 段落**：由 `<!-- amm:memory-section begin/end -->` 包裹，合并时检测 marker 保证幂等。

## 扩展点

- **新增智能体**：在 `src/lib/agents.js` 与 `packages/spec/agent-adapters.yaml` 各加一条，并补 `adapters/<id>.md`
- **修改骨架**：只改 `templates/project-memory/`，`amm init --force` 会补全空文件而不动已有内容
- **语义检索**：见 [mcp-optional.md](mcp-optional.md)，核心永不依赖
