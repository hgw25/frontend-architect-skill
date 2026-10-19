已完成看板卡片排序；实现已就绪，但浏览器验收受当前沙箱权限限制。

主要改动：

- 按钮与拖拽共用同一排序状态，卡片 DOM 身份和焦点保持稳定。
- 使用可中断 FLIP 动画，连续操作从当前位置平滑续接。
- 支持减少动态效果、隐藏及窗口调整时清理动画。
- 保存请求串行化并合并最新顺序；失败提供可见提示和重试。
- 消除了逐卡写入后读取布局的性能问题。
- 补充了[技术设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-hy6w7puw/docs/card-reordering-design.md)。

验证结果：

- `node --check src/app.mjs`：通过
- `node --check src/api.mjs`：通过
- `git diff --check`：通过
- `npm run check`：环境禁止监听 `127.0.0.1`，报 `EPERM`
- Chromium 直接启动：被 macOS 沙箱 Mach-port 权限阻止

完整浏览器测试需在普通本地或 CI 环境运行。