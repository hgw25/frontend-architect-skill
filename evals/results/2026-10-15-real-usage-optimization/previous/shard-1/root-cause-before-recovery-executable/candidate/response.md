已完成局部修复：[src/ledger.mjs:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-iqg9d8c9/src/ledger.mjs:20)。

确定的机制：

- 终态增量可能不含 `replyTo`。
- 代码虽已将增量与已保存消息合并，却错误地用原始增量更新请求 ledger，导致关联被覆盖为 `undefined`。
- 现在 ledger 使用合并后的消息事实，`done` 和 `error` 均能释放对应原请求，同时不会误释放其他请求。
- 手动恢复有效，是因为完整历史重新提供了关联；无需增加每 30 秒全量轮询。

验证结果：

- 修复前：3/7 通过，关联终态场景稳定复现失败。
- 修复后：7/7 全部通过。
- 覆盖保存关联、`done`/`error`、重复终态、未知关联、其他请求和 scope、乱序接受及显式恢复。
- `git diff --check` 通过。
- 仅修改 `src/ledger.mjs`，未改 evaluation harness 或 `.frontend-architect`。

仍不知道的是生产传输层是否还存在真正的漏事件，以及持久化数据库是否有额外差异；当前 fixture 只能确定本地合并边界的关联丢失问题。已有显式恢复能力已保留，可继续处理真正漏信号的情况。