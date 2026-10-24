## 改了什么 / 为什么

<!-- 关联 Issue：Fixes #N / Closes #N -->

## 自查清单

- [ ] `npm test` 全部通过
- [ ] 改了前端 → 已 `npm run build:ui` 并提交 `dist/`
- [ ] 涉及文件格式 → 已同步 `packages/spec/` 与 `templates/`，CLI 与 UI 走同一实现（`src/lib/memory.js`）
- [ ] 未引入运行时第三方依赖
- [ ] 新功能 / 修复已附测试
