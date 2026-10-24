# ZCode 接入

## 记忆挂载方式

| 项 | 值 |
|---|---|
| 项目指令文件 | `AGENTS.md`（ZCode 支持项目级 AGENTS.md） |
| 技能目录（视版本支持） | 项目级技能目录（如 `.zcode/skills/`）或插件 / 技能市场 |
| 真相来源 | 项目 `.memory/` |

## 接入步骤

```bash
cd your-project

# 1. 创建 .memory/ 并写入 AGENTS.md 记忆纪律段落
amm init --with-agents-md

# 2. 打印 ZCode 的挂载指引（含技能源路径与目标路径）
amm adapt --agent zcode
```

若你的 ZCode 版本支持项目级技能目录：

```bash
mkdir -p .zcode/skills
cp -r <AMM仓库>/skills/shared-memory .zcode/skills/shared-memory
```

也可以把 `skills/shared-memory` 打包成 ZCode 插件，通过插件 / 技能市场机制分发
（技能名：`shared-memory`）。

## 与私有记忆的关系

- ZCode 的会话记忆 / 私有记忆只是缓存，不是真相来源
- 重要内容必须同步进 `.memory/`；冲突时以 `.memory/` 为准

## 降级方案

AGENTS.md 是通用兜底：只要 ZCode 读取项目根目录的 AGENTS.md，
记忆纪律就会在每次会话生效，纯文件读写即可完整工作。
