已修复 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-54qufzmi/src/search.js)：

- 分离草稿与已提交查询，`retry` 始终使用后者。
- 通过请求序号实现 latest-wins，旧请求无法发布结果、错误或结束状态。
- 保留 loading/error 期间已有成功结果。
- 将 API DTO 映射为 `{ id, label }` 后才写入公开状态。
- `dispose` 后冻结状态，并阻止新请求及在途请求更新。
- 空提交和首次提交前的重试保持无操作。
- 快照继续保持独立、不可反向修改内部状态。

验证结果：

- `npm run check`：8/8 通过。
- `git diff --check`：通过。
- 仅修改了 `src/search.js`；受保护文件和 Skill 文件均未改动。