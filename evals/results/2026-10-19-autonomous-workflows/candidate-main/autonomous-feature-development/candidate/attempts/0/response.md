已完成条件字段支持。

- `enabledWhen(values)` 按每次提交重新计算一次。
- `disabled` 优先，不执行条件或校验。
- 非激活字段不会校验或提交。
- 条件、校验器和 payload 共用提交开始时的浅快照。
- 条件异常保持原样抛出。
- 保留 `__proto__` 等特殊字段名的既有行为。
- 更新了 [实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-g2mnon3p/src/process-form.js)、[README](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-g2mnon3p/README.md) 和 [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-g2mnon3p/docs/conditional-fields-design.md)。

验证结果：`npm run check` 全部 13 项测试通过，`git diff --check` 通过。仓库未配置 Mermaid 渲染器，因此设计图源码未执行渲染验证。