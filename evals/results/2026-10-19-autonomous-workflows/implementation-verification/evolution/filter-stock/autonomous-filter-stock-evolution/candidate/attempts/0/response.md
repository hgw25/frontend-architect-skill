已完成商品库存筛选；单元和静态检查通过，浏览器验收因沙箱禁止监听本地端口而未能运行。

主要改动：

- 新增 `Product stock` 下拉框：All / In stock / Out of stock。
- 库存作为产品草稿，只有 Apply 后生效。
- 使用 `p_stock=in|out`，All 时移除该参数。
- Reset 恢复 All。
- 支持刷新、前进和后退恢复库存条件。
- 使用 `availableProductIds` 判断库存，并与关键词、分类、发布状态组合筛选。
- 订单筛选行为保持不变。
- 更新了[筛选设计文档](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-filter-stock-evolution-candidate-9c2dw5wv/docs/filtering-design.md)。

验证结果：

- `node --test test/*.test.mjs`：10/10 通过。
- 所有源码 `node --check` 通过。
- `git diff --check` 通过。
- `npm run check`：测试服务器启动时被环境以 `listen EPERM 127.0.0.1` 拒绝，Playwright 用例未实际执行。