已完成 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-q_2pcpt9/src/search.js) 修复：

- 请求 ID 保证只有最新请求可发布成功、错误及结束状态。
- `retry()` 使用最后提交的查询，不读取当前草稿。
- `dispose()` 冻结状态并阻止后续请求和状态更新。
- DTO 在发布前转换为 `{ id, label }`。
- 加载及失败期间保留上次成功结果。
- `getState()` 返回独立快照。
- 未修改受保护文件、依赖或 Skill 文件。

验证通过：`npm run check`，8/8 测试通过；`git diff --check` 通过。