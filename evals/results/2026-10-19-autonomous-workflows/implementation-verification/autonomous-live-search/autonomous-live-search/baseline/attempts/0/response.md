已完成 [src/search.js](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-search-baseline-o64gbi13/src/search.js)：

- 提交时裁剪并固定查询词，空查询不发请求
- 最新启动的请求独占状态更新，避免竞态覆盖
- 重试使用最近一次已提交查询，不受草稿变化影响
- 保留上次成功结果直至新请求成功
- 统一转换服务端 DTO 为 `{ id, label }`
- 正确处理 `Error` 与非 `Error` 异常
- `dispose()` 后冻结状态、废弃在途结果并禁用后续命令
- 状态快照与内部数据隔离

验证：`npm run check` 全部 8 项测试通过，`git diff --check` 通过。评测文件未修改。