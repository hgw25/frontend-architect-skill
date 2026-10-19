已完成导出职责重构。

- 新增 [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-candidate-z1cey76t/src/export-selection.mjs)，统一负责资格检查、协议编码、单次发送和结果生成。
- 工具栏与键盘入口保留原公开函数，但现在只提交一次完整导出意图。
- 移除暴露内部阶段和可变上下文的 `export-steps.mjs`。
- 保持返回值、选择顺序、一次发送、等待期间 ID 稳定及原始错误传递契约。
- 未增加依赖，也未引入工作流或插件抽象。

验证：

- `node --test test/export.test.mjs`：10/10 通过
- `node --check src/export-selection.mjs`：通过
- `git diff --check`：通过