已完成导出逻辑重构，两个公开入口及行为保持不变。

- 在 [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-yfai5073/src/export-selection.mjs:1) 集中导出规则、协议构造和提交主链。
- 移除依赖可变 context 和固定调用顺序的 `begin → classify → encode → dispatch` 工作流。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-yfai5073/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-yfai5073/src/keyboard.mjs:1) 直接映射到同一个内聚操作，避免重复编排。
- 删除了已无用途的 `export-steps.mjs`；该删除受 Git 跟踪，可恢复。
- 以“协议升级并增加导出元数据”为后续变化检查：现在只需调整 `createExportRequest`，不会牵动资格规则或两个入口；资格规则变化则集中在 `decideSelectionExport`。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- 两个公开入口额外冒烟检查通过。
- `git diff --check` 通过。
- README、既有测试和 `.frontend-architect` 均未修改。

仍未证明：仓库没有实际 DOM、快捷键监听或工具栏组件，因此这里只验证了公开函数边界，未验证浏览器中的真实交互接线；同时依照 README，将 `write` 视为不会修改借用 payload 的可信传输能力。