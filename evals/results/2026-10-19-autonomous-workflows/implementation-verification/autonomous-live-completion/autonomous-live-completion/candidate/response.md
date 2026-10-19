已修复回复完成后仍处于等待状态的问题。

根因是完成快照未携带 `replyTo` 时，账本错误地使用快照而非合并后的消息记录更新请求状态。现改为从持久化合并结果读取关联、消息 ID 和终态：[src/ledger.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-completion-candidate-i4mpzja4/src/ledger.mjs:24)。

验证结果：

- `node --test test/*.test.mjs`：7/7 通过
- `git diff --check`：通过
- 未修改 `.frontend-architect` 和只读测试文件