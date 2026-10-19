技术方案已完成并保存至 [card-reordering-technical-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-reorder-design-candidate-x91u6ryi/docs/card-reordering-technical-design.md)。

核心决策：

- 以 `desiredIds` 作为唯一渲染顺序，拖动和按钮共用 `moveCard` 规则。
- 使用可中断 FLIP 保持空间连续性；动画失败、resize 或卸载不影响真实顺序。
- 保存采用单请求串行、等待期间合并最新快照，避免旧请求覆盖新顺序。
- 保存失败保留当前乐观顺序并复用标准错误，不用陈旧快照回滚。
- 焦点按 `card.id + action` 保持，提供 live region，并支持减少动态效果。
- 文档包含技术架构图、数据流图、4 个依赖有序实施步骤、验收矩阵和后续跨列变化检查。

已执行 `git diff --check`，无格式问题。由于工作区没有真实应用源码、包清单或测试环境，浏览器交互、API 语义和性能检查均明确标记为待验证；未虚构实现或测试结果。`.frontend-architect` 内容未修改。