1. **高：客户身份被错误合并。** 保留目录与财务的模型、标识及现有数据层；同名字段不能证明同一实体。没有权威映射时跨域跳转应保持未解析，不能客户端猜测。核对实际路由使用的身份，并检查未知映射。[Bounded Context](https://martinfowler.com/bliki/BoundedContext.html) 按模型语义划界，页面文件夹不是判据。

2. **高：跨币种比较无定义。** 金额应携带币种；同币种按约定单位、精度比较，无换汇契约时拒绝跨币种比较。不能仅凭 number 判定已有精度错误；应补查舍入、边界与币种检查。

3. **高：重放会重复发邀请。** 调试 action 日志不是权威事件历史；保留 Redux，重放状态时隔离 HTTP 副作用，并检查不发送邀请。[Event Sourcing](https://martinfowler.com/eaaDev/EventSourcing.html#ExternalUpdates) 要有可重建状态的事件存储及重放策略。

4. **中：命名不当且丢失确认。** 保存回执可保留，明确这是偏离严格 [CQS](https://martinfowler.com/bliki/CommandQuerySeparation.html) 的实用命令；刷新列表不构成 [CQRS](https://martinfowler.com/bliki/CQRS.html)。沿用现有数据层，检查保存成功、列表读取失败时最终页面仍显示回执，只重试读取。

已核对所列原作者资料及指定指南；未取得应用或服务契约，未运行上述检查，不建议新增事件存储或读写服务。
