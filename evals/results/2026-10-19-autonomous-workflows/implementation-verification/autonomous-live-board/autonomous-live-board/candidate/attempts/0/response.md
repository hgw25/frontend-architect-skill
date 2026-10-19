已完成看板卡片排序；实现代码已就绪，但当前沙箱阻止启动本地服务和 Chromium，因此浏览器验收未能执行完成。

主要改动：

- 按钮与拖拽共用排序逻辑，保留卡片 DOM 身份及焦点。
- 使用可中断的 FLIP 动画，连续操作从当前视觉位置衔接。
- 支持 reduced-motion，并在隐藏、滚动、缩放时清理动画和拖拽状态。
- 保存请求串行合并，始终持久化最新顺序；失败提供可见错误和重试。
- 移除了逐卡写入后强制布局读取的性能问题。
- 新增[技术设计文档](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-a980tcfn/docs/board-reordering.md>)。

核心实现位于 [src/app.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-a980tcfn/src/app.mjs:39>)，样式位于 [src/style.css](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-a980tcfn/src/style.css>)。

验证结果：

- `node --check src/app.mjs`：通过
- `git diff --check`：通过
- `npm run check`：环境以 `listen EPERM 127.0.0.1` 阻止测试服务器
- 无服务器 Chromium 检查：环境以 Mach port 权限拒绝阻止浏览器启动

遵循了仓库内的 [Frontend Architect Skill](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-a980tcfn/.frontend-architect/SKILL.md>)，据此明确了排序状态、动画生命周期和保存队列的职责边界。