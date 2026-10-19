已完成看板卡片排序与连续交互优化。

- 卡片节点按 ID 复用，按钮排序与拖动共享同一顺序状态。
- 使用可中断 FLIP 动画保持重排连贯；减少动态效果时直接落到终态。
- 保持键盘焦点，保存请求按最新快照串行处理，失败可见且可重试。
- 隐藏看板会取消动画，避免残留工作。

实现见 [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-04n7sjjr/src/app.mjs)，设计记录见 [docs/board-reordering.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-04n7sjjr/docs/board-reordering.md)。

验证：`npm run check` 通过，6/6 Playwright 测试通过。