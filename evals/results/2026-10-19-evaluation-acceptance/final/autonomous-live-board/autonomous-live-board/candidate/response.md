已完成看板卡片排序与连续操作优化。

- 稳定复用卡片 DOM，按钮重排保持焦点；支持拖到目标卡后方。
- 使用可中断 FLIP 动画，连续操作不回跳；减少动态效果时直接到终态。
- 保存采用最新顺序的串行发布；失败显示提示并可重试。
- 隐藏看板会取消动画，保存回调不会重新打开看板。
- 新增设计记录：[card-reordering-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-phjfcp20/docs/card-reordering-design.md)
- 核心实现：[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-phjfcp20/src/app.mjs)

验证：`npm run check` 全部 6 项通过。固定浏览器成本样本中，布局/样式重算从基线的 655/679 降至 23/48。