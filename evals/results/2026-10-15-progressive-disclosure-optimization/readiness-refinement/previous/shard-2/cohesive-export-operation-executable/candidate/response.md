已完成导出流程重构，并保持 README 中两个公开入口及行为不变。

主要改善：

- 用单一内聚操作 [`exportSelection`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-6a3ao9ou/src/export-selection.mjs:20) 取代 `begin → classify → encode → dispatch` 的可变 context 工作流。
- 资格判断成为纯决策函数，不再依赖调用顺序或隐式状态。
- 协议 payload 构造与 transport 调用集中在明确的副作用边界。
- toolbar 与 keyboard 入口只负责接入各自调用路径，共享同一导出语义。
- 删除旧 `export-steps.mjs`，没有保留无消费者的分步 API。

现实变化检查：若后续导出协议升级，例如调整 schema 或 payload 字段，只需修改 `createExportPayload`；资格规则、执行链和两个公开入口无需联动修改。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过
- `node --check src/export-selection.mjs`：通过
- README、既有测试及 `.frontend-architect` 均未修改
- 无旧分步 API 残留引用

尚未证明：仓库没有真实 UI/transport 集成环境，因此这里只验证了公开函数契约、异步稳定性和错误传播，未验证实际浏览器事件接线或后端协议接受情况。