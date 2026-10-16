已完成导出逻辑重构，并保持 README 规定的两个公开入口与行为不变。

主要改善：

- 用 [export-selection.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-vpghpcjj/src/export-selection.mjs:1) 替代可变 context 的 `begin → classify → encode → dispatch` 工作流。
- 资格判断成为纯决策函数；主函数清楚呈现“决策 → 单次写入 → 返回结果”。
- 工具栏和键盘入口直接重导出同一实现，避免两条执行链以后漂移。
- ID 在写入前完成快照，继续保证等待期间调用方修改 rows 不会改变提交内容。
- 删除不再适用的 `export-steps.mjs`。

以后若增加新的不合格状态或 blocked 原因，改动集中在决策边界，不需要调整入口或传输时序。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- 三个源模块均通过 `node --check`。
- `git diff --check` 通过。
- README、现有测试和 `.frontend-architect` 均未修改。

仍未证明的是浏览器集成和真实传输端行为；当前仓库没有对应运行环境或实现，本次只验证了公开模块契约及模拟 transport 下的行为。