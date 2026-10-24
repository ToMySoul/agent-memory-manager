# 安全政策

## 设计边界（先读这个）

AMM 刻意保持本地与极简：

- `amm ui` **仅监听 `127.0.0.1`**，不提供任何鉴权——因此**不要**把它暴露到局域网或公网（不要做端口转发 / 反向代理）
- 所有读写都限制在你显式打开的项目目录内；界面偏好保存在 `~/.amm/ui-state.json`
- 无数据库、无遥测、无云服务；记忆全部是项目内 Markdown

## 报告漏洞

如果你发现了安全漏洞（尤其是：路径穿越、任意文件读写、命令注入、SSRF）：

1. **请不要公开提 Issue**，改用 GitHub 私有渠道：[报告安全漏洞](https://github.com/ToMySoul/agent-memory-manager/security/advisories/new)
2. 请附：影响版本（`amm --version`）、复现步骤、影响评估
3. 会在 7 天内响应；修复后会在 [CHANGELOG](CHANGELOG.md) 与 Release 中致谢（除非你希望匿名）

## 支持版本

| 版本 | 支持状态 |
|---|---|
| 0.2.x | ✅ 支持 |
| < 0.2 | ❌ 请升级 |
