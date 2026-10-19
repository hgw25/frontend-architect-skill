已完成看板卡片排序与连续操作体验。

- 稳定复用卡片节点，保留焦点；连续排序采用 FLIP 平滑衔接，不跳回旧位置。
- 支持拖动排序、上下按钮排序、减少动态效果。
- 保存按最新顺序串行协调；失败显示 Retry save，不会回滚新操作。
- 隐藏、滚动、缩放后会清理动画，不产生幽灵卡片。

实现与设计记录：
[src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-cs_4xqeb/src/app.mjs)
[卡片排序设计](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-candidate-cs_4xqeb/docs/card-reordering-design.md>)

验证：`npm run check` 通过，6/6 Playwright 测试成功。