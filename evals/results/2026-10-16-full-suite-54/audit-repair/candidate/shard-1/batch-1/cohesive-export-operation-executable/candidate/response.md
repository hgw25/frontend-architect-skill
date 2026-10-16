已完成导出逻辑重构，并保持 README 中两个公开入口及行为不变。

实际改善：

- [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-dcp2q_vn/src/export-selection.mjs:1) 现在完整负责一次导出：先形成资格决定，再执行唯一写入，最后返回结果。
- 移除了依赖调用顺序的 `begin/classify/encode/dispatch` 和可变 context。
- 资格规则由 `decideSelectionExport` 负责；传输协议由 `createExportPayload` 负责，职责边界明确。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-dcp2q_vn/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-dcp2q_vn/src/keyboard.mjs:1) 保留原公开函数，仅作为入口适配器调用共享操作。
- 删除了职责已被替代的 `export-steps.mjs`。
- 按 Skill 指引采用“先决定、后副作用”的主链，避免隐藏顺序依赖。

后续变化检查：若协议升级 schema 或增加请求字段，只需调整 `createExportPayload`；不会迫使两个入口或资格判断同步修改。若新增资格规则，则集中在决定函数内。

验证：

- `node --test test/export.test.mjs`：10/10 通过。
- `git diff --check`：通过。
- README 和现有测试均未修改。

仍未证明：测试使用的是传入的模拟 `write`，因此没有验证真实传输实现、浏览器事件绑定或服务端对协议的接受情况；这些内容不在当前仓库提供的范围内。