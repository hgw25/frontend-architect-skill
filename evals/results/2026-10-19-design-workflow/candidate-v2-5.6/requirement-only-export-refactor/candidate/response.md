已完成导出职责重构，保留全部现有公开契约。

- [export-steps.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-candidate-p9xxxp78/src/export-steps.mjs) 现在由 `exportSelection` 统一负责检查、ID 快照、协议编码、单次发送和结果返回。
- 工具栏与键盘入口仅表达一次完整导出意图。
- 保持原有返回值、提交顺序、一次发送、行数据不变及原始错误传递。
- 未增加依赖、可暂停流程或插件机制。
- 按本地 Skill 要求新增了[技术设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-requirement-only-export-refactor-candidate-p9xxxp78/docs/selection-export-design.md)。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过
- `node --check src/export-steps.mjs`：通过
- `git diff --check`：通过
- 确认旧阶段 API 在 `src` 和 `test` 中无残留引用
- `README.md`、原测试及 `.frontend-architect` 均未修改

仓库未配置 Mermaid 渲染器，因此设计图语法未经过渲染器验证。