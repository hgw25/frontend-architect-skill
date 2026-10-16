已完成局部修复：[src/ledger.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-root-cause-before-recovery-executable-candidate-lbf_3em1/src/ledger.mjs:21)。

确定的机制：

- 终态增量事件缺少 `replyTo`。
- 消息层已从旧记录合并出完整关联，但请求 ledger 错误地读取原始增量，导致原请求仍显示等待。
- 手动恢复有效，是因为全量历史重新携带了 `replyTo`，并不能证明需要定时轮询。
- 修复后 ledger 使用合并后的消息事实，且不会误释放其他请求或作用域。

验证结果：

- 修复前：7 项中 4 项失败。
- 修复后：`node --test test/*.test.mjs`，7/7 通过。
- `node --check src/ledger.mjs` 通过。
- `git diff --check` 通过。
- 显式历史恢复能力保留，未增加 30 秒轮询或定时器。

仍无法由该 fixture 确定：历史生产事故是否还存在独立的事件丢失或持久化失败路径；这需要生产侧事件记录验证。因此保留已有手动恢复，但没有把它升级为无证据支持的后台全量轮询。