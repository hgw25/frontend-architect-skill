已完成导出代码重构，README 的两个公开入口及行为保持不变。

实际改善：

- [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-o8_m9sn2/src/export-selection.mjs:1) 现在集中拥有资格判定、稳定 ID 快照、协议构造、写入和结果返回。
- 删除了依赖调用顺序和共享可变 context 的 `begin → classify → encode → dispatch` API。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-o8_m9sn2/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-o8_m9sn2/src/keyboard.mjs:1) 只负责公开入口，不再重复掌握内部执行顺序。
- 未添加框架、工作流系统或无实际收益的通用抽象。

现实变化检查：若后续调整导出协议字段，只需修改核心操作的 payload 构造；资格规则和两个入口无需同步修改。若改变资格规则，则有明确的纯判定函数承接。

验证：

- `node --test test/export.test.mjs`：10/10 通过。
- `git diff --check`：通过。
- 已确认没有旧步骤 API 的残留引用。
- README、既有测试和 `.frontend-architect` 均未修改。

仍未证明：这些是本地 Node 契约测试，没有验证真实 UI 事件绑定或生产 transport 集成；`write` 不修改 payload 仍按 README 的可信传输契约成立。