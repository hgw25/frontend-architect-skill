条件字段支持已完成。

- `enabledWhen(values)` 每次提交仅计算一次。
- `disabled` 优先，不执行条件或校验。
- 非激活字段不会校验、阻塞或进入 payload。
- 条件、校验和 payload 共用同一顶层值快照，避免异步期间外部修改影响提交。
- 条件、校验及发送异常保持原样传播。
- 更新了 [实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-20r83t8s/src/process-form.js)、[公共契约](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-20r83t8s/README.md) 和 [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-20r83t8s/docs/conditional-fields.md)。

验证：`npm run check`，13/13 测试通过；评测 harness 文件未修改。