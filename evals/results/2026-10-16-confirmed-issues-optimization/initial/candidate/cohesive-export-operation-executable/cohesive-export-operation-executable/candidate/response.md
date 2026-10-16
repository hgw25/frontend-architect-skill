已完成重构，保持 README 中两个公开入口及全部行为不变。

- 新增内聚的 [`exportSelection`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-f8peyjx_/src/export-selection.mjs:16)，主链清晰呈现“判定资格 → 写入一次 → 返回结果”。
- 私有纯函数 `decideExport` 集中负责空选择、阻止名单和稳定 ID 快照。
- [`handleToolbarExport`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-f8peyjx_/src/toolbar.mjs:3) 与 [`handleKeyboardExport`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-f8peyjx_/src/keyboard.mjs:3) 保留原契约，仅承担入口适配。
- 删除了需要调用方掌握执行顺序的 `begin/classify/encode/dispatch` 可变上下文协议。

以后若增加命令菜单导出入口，只需新增薄入口并调用 `exportSelection`，无需复制资格规则、协议编码或阶段顺序，也没有引入通用工作流框架。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- `git diff --check`：通过。
- `.frontend-architect`、README 和既有测试均未修改。

仍未证明的是浏览器中的真实 UI 触发接线及实际传输端行为；当前仓库只提供单元级契约测试。未增加无效行数据防御，因为 README 明确规定 rows 已在内部完成验证、write 是可信传输能力。