# 贡献指南

感谢你考虑为 Agent Memory Manager 贡献！这个项目的目标很小而清晰：
**让所有编程智能体共享同一份项目记忆，不引入任何强制依赖。**

## 开始之前

- 先读 [README.md](README.md) 了解 `.memory/` 布局与读写纪律
- 规范正文在 [`packages/spec/`](packages/spec/)，改动格式相关的 PR 必须先改规范、再改代码
- 一个 PR 只做一件事；提交信息用中文或英文均可，建议 `feat:` / `fix:` / `docs:` / `test:` 前缀

## 开发环境

```bash
git clone https://github.com/ToMySoul/agent-memory-manager.git
cd agent-memory-manager
npm install        # 仅前端构建依赖（src/ui/client）
npm test           # CLI 冒烟测试（38 项）+ UI API 全链路测试（43 项）
```

要求：Node.js ≥ 18（开发/测试）；运行 CLI 本身仅需 ≥ 16。

## 提交 PR 前的检查清单

- [ ] `npm test` 全部通过（CI 会跑 Ubuntu/Windows × Node 18/20/22）
- [ ] 改了前端（`src/ui/client/`）→ 已执行 `npm run build:ui` 并把 `dist/` 一并提交
- [ ] 改了文件格式 / 布局 → 同步更新 `packages/spec/` 与 `templates/`，并保持 CLI 与 UI 走同一实现（`src/lib/memory.js`），**禁止两套互相打架的格式**
- [ ] 新功能附测试；修复先写能复现的测试
- [ ] 不引入运行时第三方依赖（核心原则：`bin/` + `src/lib/` + `src/ui/server/` 保持零依赖）

## 新增智能体适配

1. 在 `src/lib/agents.js` 注册（`adaptAction: 'write' | 'print'`）
2. 同步 `packages/spec/agent-adapters.yaml`
3. 写 `adapters/<agent>.md` 接入文档
4. 补充 `test/smoke.js` 的 adapt 用例

## 报告问题

提 Issue 请选择对应模板（bug / 功能 / 适配新智能体），并附上：
- `amm --version`、Node 版本、操作系统
- 复现步骤与期望行为

## 行为准则

保持友善与专业；对事不对人。中文英文均可交流。
