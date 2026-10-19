已完成看板卡片排序：

- 支持按钮与拖拽排序，连续操作保持平滑且不回跳。
- 移动后保留卡片 DOM 与按钮焦点。
- 保存请求串行合并，确保最终持久化最新顺序。
- 保存失败提供可见提示和 `Retry save`。
- 隐藏、滚动、窗口调整会清理动画和拖拽状态。
- 支持 `prefers-reduced-motion`。
- 消除了逐卡布局读写导致的性能抖动。

修改文件：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-zr8ucqnc/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-zr8ucqnc/src/style.css)

验证结果：`npm run check`，6 项浏览器测试全部通过。