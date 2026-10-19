## 审查发现

- **P2 — 将单次导出拆成可变、顺序敏感的分阶段协议，违背仓库契约并降低可维护性。**  
  [`export-steps.mjs:1`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-maintainability-candidate-k8x1o36z/after/src/export-steps.mjs:1) 暴露 `begin → classify → encode → dispatch`，通过逐步修改 `context` 隐式传递前置条件；漏调或调换步骤会产生无效状态。两处入口又分别复制了这套调用顺序（[`toolbar.mjs:4`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-maintainability-candidate-k8x1o36z/after/src/toolbar.mjs:4)、[`keyboard.mjs:4`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-maintainability-candidate-k8x1o36z/after/src/keyboard.mjs:4)）。这与 README 明确规定的“一个选择对应一个操作、消费者不需要可暂停准备流程”相冲突。未来增加校验、编码字段或写入前步骤时必须同步修改两个入口，且顺序正确性没有由 API 保证。建议恢复一个拥有完整流程的 `exportSelected(rows, write)`，两个入口只委托该操作。

功能层面的公开契约目前未发现回归：`before/` 和 `after/` 的 10 项 Node 测试均通过，包括全有或全无、顺序、单次写入、错误透传及等待期间 ID 稳定性。但测试未覆盖上述结构性要求，因此通过测试不足以接受这次重构。

未修改任何快照或 `.frontend-architect` 文件。