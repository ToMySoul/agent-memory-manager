# 条目格式规范（entry-format）

> 版本：1 ｜ 规范仓库：[agent-memory-manager](https://github.com/ToMySoul/agent-memory-manager)
> 本文件定义 decisions / gotchas / conventions 的条目格式与交接文件格式。

## 1. 条目格式（三类文件通用）

```markdown
### YYYY-MM-DD | agent:<name> | 一句话摘要
- 详情：
- 影响范围：
- 相关路径：
```

语法：

```
heading := "### " date "| agent:" name "| " summary
date    := YYYY "-" MM "-" DD        （本地日期）
name    := [A-Za-z0-9_.-]+           （作者智能体标识，如 codex / dsh / zcode / grok / human）
summary := 一行非空文本
```

### 合法示例

```markdown
### 2026-10-24 | agent:codex | 选 SQLite 而非 MySQL 作为本地缓存
- 详情：单机部署、零运维，读写模式以 KV 为主
- 影响范围：storage/ 模块与迁移脚本
- 相关路径：src/storage/db.ts、migrations/0001_init.sql
```

### 非法示例（`amm validate` 会 WARN）

```markdown
### 选了 SQLite                      ← 缺日期与作者
### 2026-10-24 | codex | 选 SQLite    ← 作者缺 agent: 前缀
### 2026-10-24 | agent:codex |        ← 缺摘要
```

注意：``` 围栏代码块内的 `###` 不会被当作条目解析。

### 追加规则

- 新条目追加在文件**末尾**（时间自然有序）
- 只追加，不改写、不删除他人条目；勘误用追加新条目说明

## 2. current-status.md 格式

自由 Markdown，但必须包含以下小节：

```markdown
## 最近更新
## 进行中
## 阻塞 / 待决
## 下一步
```

「最近更新」每行建议：`- YYYY-MM-DD HH:MM | agent:<name> | 摘要`（最新在最上）。

## 3. 交接文件（handoffs/）

文件名：`YYYY-MM-DD_HHMM_<slug>.md`

- 时间为本地时间，`HHMM` 为 24 小时制 4 位数字
- `<slug>` 由摘要生成：空白转 `-`，剔除 Windows 非法字符 `\/:*?"<>|`，保留中文，≤ 60 字符
- 同分钟同名时追加 `-2`、`-3` …
- `_template.md`（下划线开头）是模板，不计入交接记录

正文结构（`amm handoff` 自动生成）：

```markdown
# Handoff：<一句话摘要>

- 日期：YYYY-MM-DD HH:MM
- from：<交出方 agent>
- to：<接收方 agent>

## 已完成
## 未完成
## 风险与注意
## 下一步
```

## 4. AGENTS.md 段落

由成对 marker 包裹，`amm init --with-agents-md` / `amm adapt` 幂等写入：

```text
<!-- amm:memory-section begin -->
… 记忆读写纪律 …
<!-- amm:memory-section end -->
```

已含 marker 时跳过；不含时追加到文件末尾。
