已完成 `createSearch` 修复，仅修改 [src/search.js](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-search-request-lifecycle-executable-candidate-pgorbk0t/src/search.js)。

实现包括：

- 请求代次控制，只有最新启动请求能发布成功、错误和结束状态
- `retry` 始终使用已提交查询
- `dispose` 后冻结状态并阻止新请求
- DTO 转换为 `{ id, label }`
- 独立状态快照，避免外部修改内部数据
- 空白提交及首次提交前 retry 保持 no-op
- 加载和失败时保留已有结果

验证结果：`npm run check` 全部 8 项测试通过，`git diff --check` 通过。受保护文件和 `.frontend-architect` 均未修改。