# Grok / 其他智能体接入

## 定位

Grok 及其他任何支持 `AGENTS.md`（或 `SKILL.md`）的编程智能体，都可以零成本接入 AMM：
**AGENTS.md 是通用兜底**——把记忆纪律写进项目根目录的 AGENTS.md，所有读它的智能体自动遵守。

## 记忆挂载方式

| 项 | 值 |
|---|---|
| 项目约定文件 | `AGENTS.md`（通用）；部分智能体用 `GROK.md` / 自有说明文件，内容照抄同一段即可 |
| 技能目录（视版本支持） | `.agents/skills/shared-memory/` |
| 真相来源 | 项目 `.memory/` |

## 接入步骤

```bash
cd your-project

# 1. 创建 .memory/ 并写入 AGENTS.md 记忆纪律段落
amm init --with-agents-md

# 2. 打印挂载指引
amm adapt --agent grok
```

若智能体使用自有的说明文件（如 `GROK.md`），把 AGENTS.md 中
`<!-- amm:memory-section begin -->` 到 `<!-- amm:memory-section end -->` 之间的段落原样复制过去即可。

## 与私有记忆的关系

- 各智能体私有记忆只是缓存 / 草稿，不是真相来源
- 重要内容必须同步进 `.memory/`；冲突时以 `.memory/` 为准

## 降级方案

纯文件读写：智能体不需要任何特殊支持，只要按 `.memory/README.md`
的读写纪律读写 Markdown 即可参与协作。
