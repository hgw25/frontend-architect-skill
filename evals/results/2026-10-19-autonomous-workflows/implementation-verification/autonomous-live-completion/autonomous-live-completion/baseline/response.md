已修复回复完成后仍等待的问题。

原因：完成快照缺少 `replyTo` 时，账本未使用已保存消息中的关联信息。

改动：[src/ledger.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-completion-baseline-k7imzwh1/src/ledger.mjs:21) 现在基于合并后的消息更新请求状态。

验证结果：

- `node --test test/*.test.mjs`：7/7 通过
- `git diff --check`：通过
- 未修改只读测试文件。