已完成条件字段支持。

- `enabledWhen(values)` 每次提交仅执行一次。
- 禁用字段优先跳过条件判断。
- 非激活字段不会校验、阻塞或进入 payload。
- 条件、校验器和 payload 共用同一份提交快照，避免异步期间数据漂移。
- 条件异常保持原样抛出。
- 更新了 [实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fgeun8zc/src/process-form.js)、[使用说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fgeun8zc/README.md)及[技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fgeun8zc/docs/conditional-fields-design.md)。

验证：`npm run check`，13/13 测试通过；`git diff --check` 通过。仓库没有 Mermaid 渲染器，因此设计图仅完成结构审查，未进行工具渲染验证。