# MCP 语义记忆（可选增强）

> **先说结论**：AMM 核心不依赖 MCP、不依赖 embedding / 向量库、不依赖任何联网服务。
> 本文档描述的是可选增强——默认不用也能完整工作。

## 为什么默认不用

- `.memory/` 是纯 Markdown，条目数量级通常是几百行，直接让智能体读文件已足够
- 引入向量库会带来部署、索引一致性、成本等复杂度，违背「零强制依赖」原则
- 决策 / 踩坑 / 约定需要**精确**上下文（日期、路径、因果关系），语义检索反而可能漏召回关键约束

## 什么时候值得挂 MCP

- 大型 monorepo，记忆文件增长到数千条，智能体上下文装不下
- 需要跨项目检索历史决策（「上次选 SQLite 是哪年、为什么」）

## 接入原则（必须遵守）

1. **`.memory/` 仍是唯一真相来源**：MCP 服务只是索引 / 检索层，索引可以随时从文件重建
2. **写入永远落盘到 `.memory/`**：MCP 侧不允许产生只存在于索引里的记忆
3. **失效即降级**：MCP 服务不可用时，一切退回纯文件读写，功能无损

## 示例配置

假设你有一个读 `.memory/` 建索引的语义记忆 MCP 服务（如自建 memory-semantic-server）：

```json
{
  "mcpServers": {
    "memory-semantic": {
      "command": "npx",
      "args": ["-y", "memory-semantic-server"],
      "env": {
        "MEMORY_ROOT": ".memory",
        "REBUILD_ON_START": "true"
      }
    }
  }
}
```

智能体侧用法约定（写进项目 AGENTS.md 即可）：

```text
检索记忆时可调用 memory-semantic 的 search 工具；
但任何写入必须落到 .memory/ 的 Markdown 文件（遵守 shared-memory 技能的读写纪律）。
```

## 一句话总结

MCP 是放大器，不是地基：地基永远是那几份进 Git 的 Markdown。
