已完成看板卡片排序与连续操作体验。

- 键控 DOM 重排 + FLIP 动画，连续操作从当前可见位置平滑衔接。
- 支持按钮排序、拖拽排序、焦点跟随、减少动态效果。
- 保存采用最新快照队列；失败显示警告并可 Retry，不会回滚新排序。
- 隐藏看板、窗口调整时会清理动画。

实现见 [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-iz3fe6y3/src/app.mjs)；设计与验证记录见 [DESIGN.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-iz3fe6y3/DESIGN.md)。

验证：`npm run check` 通过，6/6 Playwright Chromium 检查成功。