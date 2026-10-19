已完成技术方案，文档位于：

[商品页与订单页筛选区技术方案](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-filter-design-candidate-dm1qi32m/docs/filter-area-technical-design.md)

核心决策：

- URL 是已生效筛选的唯一来源。
- 商品页维护未提交草稿，应用后 `push` URL。
- 订单页合法编辑立即 `replace` URL；仅非法日期输入保留临时缓冲。
- 商品上架状态与订单状态使用独立类型及 codec。
- 订单默认日期显式写入 URL，保证跨日刷新仍恢复原范围。
- 只共享无业务状态的筛选布局，不建设通用筛选框架。
- 查询层继续拥有数据、加载、错误和陈旧响应处理；结果数量不重复保存。

文档包含代码契约、两张纯文本架构/数据流图、5 步实施顺序、验证矩阵、无障碍与响应式要求，并明确标注了待源码确认事项。由于工作区没有应用源码或测试入口，本次未实施或声称运行时验证通过；`.frontend-architect` 保持未修改。