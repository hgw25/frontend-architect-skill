已完成条件字段支持，并保持 `processForm` API、原字段语义及零依赖不变。

- [process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-c37mm8hp/src/process-form.js:2)：提交开始时生成顶层浅快照；先处理 `disabled`，再将 `enabledWhen(snapshot) === true` 的字段固定为本次 eligible 集合。
- required、自定义校验和最终 payload 均使用同一快照；条件仅执行一次，回调异常保持原样传播。
- [新增契约测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-c37mm8hp/test/conditional-fields-contract.test.js:1)：覆盖严格返回 `true` 及所有条件先于校验完成。
- [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-conditional-fields-candidate-c37mm8hp/docs/conditional-fields-design.md:1) 与 README 契约说明已同步。
- 指定的 harness 文件及 `.frontend-architect` 均未修改。

验证结果：`npm run check` 15/15 通过，`git diff --check` 通过。