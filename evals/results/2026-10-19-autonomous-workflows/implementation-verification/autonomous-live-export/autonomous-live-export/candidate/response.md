已完成：工具栏与快捷键现在共用同一个原子导出能力，同时保留原有公开函数名。

- 新增统一实现：[export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-export-candidate-c5_v_cf3/src/export-selection.mjs)
- 两个入口改为命名重导出，后续资格规则、payload 或错误行为只需修改一处
- 删除旧的可变分阶段流程 `export-steps.mjs`
- 按本地架构指导补充设计与演进记录：[export-capability.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-export-candidate-c5_v_cf3/docs/export-capability.md)
- 新增共享实现及异步快照测试：[export-selection.test.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-export-candidate-c5_v_cf3/test/export-selection.test.mjs)
- `.frontend-architect` 未修改

验证结果：12/12 测试通过，`git diff --check` 通过。