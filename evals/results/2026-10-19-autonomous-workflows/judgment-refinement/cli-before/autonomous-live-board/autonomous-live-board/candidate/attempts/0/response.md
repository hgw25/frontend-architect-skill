已完成看板卡片排序，连续操作保持平滑且不会回跳。

- 单一顺序状态，复用卡片节点，按钮与拖放结果一致。
- 使用可中断 FLIP 动画；隐藏、缩放、连续操作和减少动态效果均可正确收敛。
- 保存队列只提交最新顺序，支持失败提示与重试，旧响应不会覆盖新操作。
- 保留焦点、公开 Board 标记和 `data-card-id` 契约。
- 技术设计已记录于 [board-reordering-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-pmbj_z9f/docs/board-reordering-design.md)。

验证：`npm run check` 通过，6/6 Playwright 用例通过。