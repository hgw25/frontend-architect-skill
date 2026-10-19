已完成工具栏与快捷键导出能力的统一：

- 新增共享实现 [export-selection.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-export-baseline-4_2dyh7l/src/export-selection.mjs)，集中处理选择校验、载荷构造和写入。
- 工具栏与快捷键入口改为共享实现的语义化别名，避免行为漂移。
- 删除原有可变中间状态的 `export-steps.mjs`。
- 更新 [README.md](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-export-baseline-4_2dyh7l/README.md)，记录维护边界。
- 新增测试，确保两个入口确实使用同一工作流。
- 未修改只读的 `test/export.test.mjs`。

验证结果：11 项测试全部通过，`git diff --check` 通过。