已完成看板卡片排序与连续操作体验。

- 保留卡片 DOM 身份，按钮与拖拽均即时更新同一顺序状态。
- 使用可取消的 FLIP 过渡；连续操作、滚动、窗口调整、隐藏看板都会安全收尾。
- 按钮排序后焦点保留在同一卡片的操作按钮。
- 保存按顺序串行处理，旧响应不会覆盖新意图；失败显示 Retry save。
- 支持减少动态效果偏好。

设计与验收记录见 [card-reordering-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-ofhburow/docs/card-reordering-design.md)。

验证：`npm run check` 通过，6/6 Chromium 检查成功。