重构已完成。

- 新增统一的 `exportSelection(rows, write)`，集中负责检查、编码、单次发送、结果返回和错误传递。
- 工具栏与键盘两个公开入口保持不变，现在仅表达完整导出意图。
- 保留空选择、阻断结果、提交顺序、等待期间 ID 稳定性及原始错误对象。
- 未增加依赖、可暂停流程或插件机制。
- 按本地 Skill 要求补充了[技术设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-candidate-ldjnu21d/docs/selection-export-refactor.md)。

主要实现见 [export-steps.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-candidate-ldjnu21d/src/export-steps.mjs)。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过
- `git diff --check`：通过
- `README.md`、`test/export.test.mjs` 和 `.frontend-architect` 均未修改。