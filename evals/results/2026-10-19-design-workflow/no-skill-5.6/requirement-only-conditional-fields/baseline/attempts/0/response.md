已完成条件字段支持。

变更包括：

- 新增同步 `enabledWhen(values)` 条件。
- `disabled` 优先，禁用字段不会执行条件回调。
- 每次提交创建一次顶层值快照。
- 条件只求值一次。
- required、自定义校验和最终 payload 共用同一快照。
- 条件回调异常保持原对象向上传递。
- 保留原有 `processForm` API、字段语义及零依赖。
- 更新 README 契约说明。

验证：`npm run check`，13 个测试全部通过。