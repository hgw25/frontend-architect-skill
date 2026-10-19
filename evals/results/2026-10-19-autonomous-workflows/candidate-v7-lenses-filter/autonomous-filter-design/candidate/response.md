技术方案已完成并保存：

[商品页与订单页筛选区技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-filter-design-candidate-qyjp5mu6/docs/filter-areas-technical-design.md)

核心决策：

- URL 是唯一已生效筛选来源，查询参数只从 URL 派生。
- 商品页保留草稿，应用后以 `push` 更新 URL。
- 订单页合法编辑后立即以 `replace` 更新 URL；非法日期保留为局部中间态。
- 两类状态使用独立领域类型、默认值及 URL 编解码。
- 只共享布局与反馈骨架，不建设配置驱动的万能筛选器。
- 结果及数量均由既有查询数据产生。
- 文档包含技术架构图、数据流图、5 步实施计划和验收矩阵。

未执行源码、浏览器或测试验证，因为工作区没有提供应用源码与依赖。文档已通过空白错误检查，`.frontend-architect` 未被修改。