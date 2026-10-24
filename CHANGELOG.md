# Changelog

本文件记录每个版本的显著变化。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [SemVer](https://semver.org/)。

## [0.2.0] — 2026-10-24

### 新增

- **`amm ui` 本地 Web 管理界面**：深色主题（对齐 Skills Manager 信息架构），仅监听 `127.0.0.1`
  - 页面：Dashboard / 记忆库 / 交接 / 同步·挂载 / 备份 / 设置
  - 记忆库四类卡片、条目列表与详情抽屉、新建条目（落盘格式与 CLI 完全一致）
  - 交接列表与表单新建（与 `amm handoff` 同一模板与 `YYYY-MM-DD_HHMM_<slug>.md` 命名）
  - 同步页：Codex / ZCode / DeepSeek Harness / Grok 挂载检测、一键写入 AGENTS.md 段落、安装技能到项目、复制挂载说明、渲染 adapters 文档
  - 顶栏全文搜索（跨 `.memory/` 所有 Markdown）、Agent 视角过滤、最近项目
- **Git 备份仓库**：`.memory/` 独立成私有仓库，界面一键提交并推送（借鉴 Skills Manager「一份原件 + 同步」；适合开源项目工作区，记忆不混入开源代码）
- `src/lib/memory.js`：CLI 与 UI 共用的唯一读写实现（init / 条目 / 交接 / 校验 / 搜索 / 概览）
- 零依赖 ZIP 导出（store 方式 + UTF-8 文件名，PowerShell Expand-Archive 实测兼容）
- 界面测试 `test/ui-api.js`：真实启动服务器走全链路（含本地裸仓库模拟远程推送），43 项断言

### 变更

- `init` / `handoff` / `validate` 命令重构为 `src/lib/memory.js` 之上的薄封装，控制台输出与退出码不变
- README 增加「界面使用」章节；README.en 同步

## [0.1.0] — 2026-10-24

### 初始版本

- CLI：`init` / `validate` / `status` / `handoff` / `sync` / `adapt`（纯 Node.js，零依赖）
- `.memory/` 布局：decisions / gotchas / conventions / current-status / README / handoffs/
- 条目格式：`### YYYY-MM-DD | agent:<name> | 一句话摘要`
- 标准技能 `skills/shared-memory` 与 AGENTS.md 记忆纪律段落（幂等 marker 合并）
- 智能体适配：Codex（写入式）/ DeepSeek Harness / ZCode / Grok（指引式）
- 规范文档 `packages/spec/`、适配文档 `adapters/`、冒烟测试 38 项、GitHub Actions CI
