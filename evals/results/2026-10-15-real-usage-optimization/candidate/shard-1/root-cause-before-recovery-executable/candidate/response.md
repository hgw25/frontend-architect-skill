已完成局部修复，没有引入每 30 秒全量轮询。

确定的机制：

- 完成增量只包含消息 ID 和终态，`replyTo` 来自此前保存的消息。
- 原实现虽合并出了完整消息，却用未合并的增量更新请求账本，导致原请求无法被关联并释放。
- 手动恢复有效，是因为全量历史重新携带了 `replyTo`；它是恢复能力，不是根因修复。

修复位于 [src/ledger.mjs:21](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-nqu0wsqt/src/ledger.mjs:21)：请求账本现在使用合并后的消息事实，包括保存的关联、消息身份和终态。

验证结果：

- 基线：3/7 通过，4 个关联释放场景失败。
- 修复后：7/7 全部通过。
- 覆盖 `done`、`error`、重复完成、并行请求及 scope 隔离、未知关联、终态先到和显式历史恢复。
- `git diff --check` 通过。
- 仅修改 `src/ledger.mjs`，测试夹具和 `.frontend-architect` 均未改动。

仍未知的是生产环境持久层、跨进程并发及真实传输实现，因为当前工作区只有内存账本模型。现有证据足以确认并修复 fixture 所复现的漏关联机制，但不能证明生产环境不存在其他独立的漏事件原因。