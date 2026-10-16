已修复 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-_rre6m1j/src/search.js)。

实现包括：

- 分离草稿与已提交查询，空查询不提交。
- 通过请求 ID 保证仅最新启动的请求可更新结果、错误和状态。
- `retry` 始终使用最近提交的查询。
- 请求期间及失败后保留上次成功结果。
- DTO 在发布前转换为 `{ id, label }`。
- `dispose` 后冻结状态、屏蔽在途完成和后续命令。
- `getState()` 返回独立快照。

验证结果：`npm run check` 全部通过，8/8 测试成功；仅修改了 `src/search.js`。