技术方案已完成并保存至：

[看板卡片排序技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-reorder-design-candidate-gw918vw7/docs/card-ordering-technical-design.md)

核心决策：

- DOM 数组顺序是唯一业务真相，动画不保存顺序。
- 按钮与拖动共用纯 `reorder` 规则。
- 使用可中断 FLIP + WAAPI；新操作直接接管当前视觉位置。
- 保存采用乐观更新、单请求串行、合并最新完整快照及条件回退。
- 拖动期间使用显式草稿，放下后仅保存最终顺序。
- 覆盖焦点保持、读屏播报、减少动态效果、滚动、尺寸变化和卸载清理。
- 明确列出了浏览器矩阵、整页卸载持久化和服务端并发语义等待核对项。
- 提供了技术架构图、数据流图、5 个依赖有序的实施步骤及验证矩阵。

检查结果：文档结构及代码围栏完整；`git diff --check` 通过。由于工作区没有真实应用文件，未执行浏览器、测试或性能验证。

本次遵循了本地 [Frontend Architect Skill](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-reorder-design-candidate-gw918vw7/.frontend-architect/SKILL.md)，它要求设计型交付保存为实施就绪文档，并明确状态归属、异步竞态、生命周期、两类图示和实际验证边界；`.frontend-architect` 内文件均未修改。