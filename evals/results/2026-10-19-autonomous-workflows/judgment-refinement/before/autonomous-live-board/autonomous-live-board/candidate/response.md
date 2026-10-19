已完成看板卡片排序，连续操作保持平滑且状态一致。

主要改动：

- 按钮与指针拖拽共用同一排序逻辑。
- 复用稳定 DOM 节点，移动后焦点仍跟随原卡片。
- 使用可中断 FLIP 动画，连续移动不会跳回旧位置。
- 滚动、缩放、隐藏看板时清理动画和拖拽状态。
- 遵循 `prefers-reduced-motion`。
- 保存请求串行收敛到最新顺序，失败显示反馈并支持 Retry。
- 保持唯一业务顺序，不受旧响应覆盖。

相关文件：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-6ba1_6o7/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-6ba1_6o7/src/style.css)
- [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-6ba1_6o7/docs/board-reordering-design.md)

验证结果：`npm run check` 全部通过，6/6 Playwright 用例通过。固定 80 张卡片、连续 8 次操作记录为 15 次布局、约 179ms 本地墙钟时间。