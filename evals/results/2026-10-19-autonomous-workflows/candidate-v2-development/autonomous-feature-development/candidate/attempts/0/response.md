条件字段支持已完成。

- [process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-ttmovhrj/src/process-form.js:2)：支持同步 `enabledWhen(valuesSnapshot)`，禁用字段优先跳过条件；非活跃字段不会校验或提交。
- 条件、校验器和 payload 共用提交开始时的顶层快照，避免异步校验期间外部修改导致结果不一致。
- 条件函数每次提交仅执行一次，异常保持原样传播。
- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-ttmovhrj/README.md:6) 已补充公开契约。
- [conditional-fields.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-candidate-ttmovhrj/docs/conditional-fields.md) 已记录技术设计和验证依据。

验证：`npm run check` 通过，13/13 测试成功；`git diff --check` 通过。指定的评测文件及 `.frontend-architect` 均未修改。