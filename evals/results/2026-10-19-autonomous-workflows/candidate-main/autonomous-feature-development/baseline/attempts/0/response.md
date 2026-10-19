条件字段支持已完成。

- [process-form.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-baseline-1ho3yuwa/src/process-form.js:2)
  - 支持同步/异步 `enabledWhen(values)`
  - 每次提交仅计算一次条件
  - 未启用字段不校验、不提交
  - `disabled` 优先且不会执行条件函数
  - 条件、校验和 payload 共享提交开始时的顶层快照
  - 保留 `__proto__` 等特殊自有键及原有异常传播行为

- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-feature-development-baseline-1ho3yuwa/README.md:7) 已补充新契约说明。

验证结果：`npm run check` 全部 13 项测试通过，`git diff --check` 通过。未修改只读测试文件。