发现 2 个功能性问题：

- [P1] 重试发送了编辑后的草稿，而非失败时的载荷 — [publish.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-baseline-75uk01df/after/src/community/controllers/publish.mjs:24)  
  `retry()` 检查了 `failedPayload`，却调用 `send(draft.snapshot)`。首次发送 A 失败后，如果用户将草稿改为 B，重试实际发送 B，违反“重试原失败载荷”的契约。应改为 `send(failedPayload)`。现有测试未在重试前编辑草稿，因此没有捕获该问题。

- [P2] 前台恢复没有刷新创作者目录 — [lifecycle.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-baseline-75uk01df/after/src/community/lifecycle.mjs:2)  
  `onForeground()` 只刷新 `feed`，但需求明确要求同时刷新 `creatorDirectory`，否则工作区恢复后名称、头像和简介可能持续陈旧。应将 `resources.creatorDirectory.refresh()` 加入 `Promise.all`。

验证：`node --test test/*.test.mjs` 的 10 个测试均通过；快照文件未作修改。