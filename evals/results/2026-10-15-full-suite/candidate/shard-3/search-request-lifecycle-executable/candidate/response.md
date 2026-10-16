已修复 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-3xyo1j9l/src/search.js)。

实现包括：

- 使用请求 ID 保证只有最新启动的请求能更新结果、错误和结束状态。
- `retry()` 固定使用最近一次已提交查询，不受 draft 修改影响。
- 保留加载和失败前的成功结果。
- DTO 在发布前转换为 `{ id, label }`。
- `dispose()` 后冻结状态并阻止后续请求与状态更新。
- 空白提交、首次提交前 retry 均为无操作。
- `getState()` 返回独立快照。

验证结果：

- `npm run check`：8/8 通过。
- `git diff --check`：通过。
- 仅修改了 `src/search.js`；受保护文件及 `.frontend-architect` 均未改动。