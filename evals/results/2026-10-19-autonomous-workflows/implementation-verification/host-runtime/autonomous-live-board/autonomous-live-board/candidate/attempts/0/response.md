已完成看板卡片排序，连续操作保持平滑。

主要改动：

- 保留卡片 DOM 身份和按钮焦点，不再整页重绘。
- 按钮与拖拽统一更新唯一顺序状态。
- 使用可中断 FLIP 动画，连续操作从当前视觉位置接续。
- 支持减少动态效果、resize、隐藏看板时清理动画。
- 保存请求串行化，失败提供 `Retry save`，确保最终保存最新顺序。
- 补充了[技术设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-iookyjvf/docs/board-reordering.md)。

实现位于 [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-iookyjvf/src/app.mjs) 和 [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-iookyjvf/src/style.css)。

验证结果：

- `npm run check`：6/6 通过
- `node --check src/app.mjs`：通过
- `git diff --check`：通过
- 未修改现有评测文件或 `.frontend-architect` 内容。