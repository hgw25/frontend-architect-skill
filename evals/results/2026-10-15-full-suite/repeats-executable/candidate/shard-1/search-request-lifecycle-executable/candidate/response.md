已修复 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-k6s3ej5y/src/search.js:1)：

- 使用请求 ID 保证只有最新启动的请求能更新状态。
- retry 固定使用最近提交的查询。
- dispose 后冻结状态并阻止新请求。
- DTO 转换为 `{ id, label }` 后才进入 UI 状态。
- 返回独立状态快照，错误统一转换为消息。
- loading/error 期间保留上次成功结果。

验证：`npm run check` 全部通过（8/8），`git diff --check` 通过。仅修改了 `src/search.js`。