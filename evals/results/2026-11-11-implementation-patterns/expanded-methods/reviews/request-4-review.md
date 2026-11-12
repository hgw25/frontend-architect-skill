1. **高：未知结果的 POST 不可盲重试。** 按 [RFC 9110 §9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2) 修正现有客户端策略并取消页面叠加重试，保持结果未知；仅按已存在的对账契约恢复，缺失则待明确。服务若支持去重，同一操作重试须保留输入与 key；新 key 和客户端逻辑均不保证 exactly-once。检查总尝试次数、取消及最终反馈。

2. **高：禁止以双付款比较。** 按 [Branch by Abstraction](https://martinfowler.com/bliki/BranchByAbstraction.html) 先把旧调用者接到稳定接口，再接新适配器、逐步切换、验证回退后退役旧路径。源码发布不是完成；比较采用替身、回放或获授权的隔离环境，单笔真实订单只走一条支付路径。

3. **中：兼容证据不足。** 保留 mock 与生成类型检查；依 [Pact 流程](https://docs.pact.io/getting_started/how_pact_works) 补 provider 契约验证，并验证打包产物的公开入口与消费者。当前均为待执行检查。

4. **中：expected 是循环论证。** 用已装属性工具，根据明确 URL 契约设独立示例、适用的幂等性与语义保持性质，生成编码输入并留 seed、缩小反例；函数自身输出不能充当 oracle。[fast-check 官方指南](https://fast-check.dev/docs/introduction/getting-started/)

仅核对提案、指定指南与上述资料；未运行测试、发布、真实支付或改动 provider。
