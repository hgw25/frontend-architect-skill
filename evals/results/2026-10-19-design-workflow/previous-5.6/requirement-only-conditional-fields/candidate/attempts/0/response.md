已完成条件字段支持，同时保留现有 `processForm` API、字段语义和零依赖约束。

改动：

- 提交开始时创建顶层浅快照。
- `disabled` 优先，不执行 `enabledWhen`。
- `enabledWhen(snapshot)` 每次提交仅求值一次，且仅严格返回 `true` 时字段参与 required、校验和 payload。
- 校验器与最终 payload 始终使用同一份提交快照。
- 条件回调异常不包装，原样向上传递。
- 更新了 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-gg1tsle3/README.md) 契约说明。
- 实现在 [process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-gg1tsle3/src/process-form.js)。

验证：`npm run check`，13/13 项测试通过。未修改评测文件或 `.frontend-architect` 内容。