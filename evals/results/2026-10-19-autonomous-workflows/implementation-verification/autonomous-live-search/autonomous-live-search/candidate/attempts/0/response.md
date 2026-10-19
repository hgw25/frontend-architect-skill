已完成搜索请求生命周期处理：

- 提交时裁剪并固定查询，空查询不发请求。
- 最新请求独占结果、错误和状态发布，旧请求不会覆盖新状态。
- 重试使用最近一次已提交查询，不受当前草稿影响。
- DTO 转换为 `{ id, label }`，快照与内部状态隔离。
- `dispose()` 后冻结状态，忽略待完成请求及后续操作。
- 按本地 Skill 补充了[技术设计与验证记录](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-search-candidate-s9vdli4s/SEARCH_LIFECYCLE_DESIGN.md)。

主要实现：[src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-search-candidate-s9vdli4s/src/search.js)

验证结果：`npm run check` 全部 8 项通过，`git diff --check` 通过。未修改 `package.json`、`package-lock.json` 或 `test/search.test.js`。