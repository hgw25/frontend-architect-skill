已完成看板卡片排序与连续操作支持。

- 复用卡片 DOM 节点，按钮排序后保留焦点。
- 支持按钮与拖拽的统一排序逻辑。
- 使用可取消的 FLIP 动画；连续操作、隐藏看板和减少动态效果均能正确收尾。
- 保存采用最新快照协调，支持失败提示与 Retry，旧响应不会覆盖新顺序。
- 新增实现设计文档：[board-sorting-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-mi3jicl9/docs/board-sorting-design.md)

验证：`npm run check` 通过，6/6 Chromium 用例通过。