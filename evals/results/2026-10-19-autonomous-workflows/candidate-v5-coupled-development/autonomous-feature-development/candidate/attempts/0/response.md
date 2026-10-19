条件字段支持已完成。

- 在 [process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fy6wlp4g/src/process-form.js) 中加入 `enabledWhen(snapshot)`。
- 禁用字段优先，不执行条件回调。
- 非激活字段不会校验或提交。
- 条件判断、校验及载荷共用同一份提交快照，避免异步校验期间外部修改数据。
- 保持原有错误传播、特殊属性名及单次发送契约。
- 更新了 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fy6wlp4g/README.md) 和 [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-fy6wlp4g/docs/conditional-fields.md)。
- 未修改指定评测文件及 `.frontend-architect`。

验证结果：`npm run check` 全部 13 项测试通过，`git diff --check` 通过。