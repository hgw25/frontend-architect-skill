已完成条件字段支持，同时保留 `processForm` API、原字段语义和零依赖约束。

主要变更：

- 提交开始时创建顶层值快照。
- `disabled` 优先，禁用字段不会执行 `enabledWhen`。
- `enabledWhen(snapshot)` 每次提交仅执行一次，且只有严格返回 `true` 才启用字段。
- required、自定义校验及最终 payload 共用同一快照。
- 条件回调异常保持原始对象向上传递。
- 保留 `__proto__`、非枚举 own-key 等既有字段行为。
- 更新了 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-7sbe5ggb/README.md) 和 [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-7sbe5ggb/docs/conditional-fields-design.md)。
- 新增独立契约测试：[conditional-fields-contract.test.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-7sbe5ggb/test/conditional-fields-contract.test.js)。

验证结果：

- `npm run check`：15/15 通过。
- `git diff --check`：通过。
- Mermaid 源码已人工检查；项目没有安装渲染器，因此未执行独立渲染验证。