已完成局部修复：[src/ledger.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-2ntxjz82/src/ledger.mjs:26)。

确定的机制：

- 终态增量事件没有 `replyTo`，但已保存消息包含该关联。
- 消息合并后，账本错误地继续读取原始 `snapshot.replyTo`，导致原请求无法匹配，甚至在重复终态后丢失关联。
- 手动恢复有效，是因为全历史重放重新提供了关联事件；这不是必须增加定时轮询的证据。
- 现改为使用合并后消息的 `stored.replyTo`。未关联终态仍不会猜测请求，其他请求和 scope 不受影响，显式恢复能力保留。

验证结果：

- 修复前：3/7 测试通过。
- 修复后：7/7 全部通过，覆盖 `done`、`error`、重复终态、乱序、请求隔离和历史恢复。
- `git diff --check` 通过。
- 未修改只读测试和 `.frontend-architect`。

仍未知的是生产环境是否还存在真实丢事件、历史数据缺少关联或持久化层差异；当前 fixture 只能确认所捕获路径的确定性身份传播缺陷。因此没有加入每 30 秒全量历史拉取。