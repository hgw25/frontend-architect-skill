已修复 `src/search.js`，未改只读文件，未提交。

- 用请求序号控制发布，旧请求成功或失败均不能覆盖最新请求。
- submit 捕获修剪后的草稿；retry 使用最近提交值；空查询不启动请求。
- DTO 映射为 `{ id, label }`；加载与失败保留成功结果。
- dispose 冻结公开状态并阻止后续请求；保留独立快照。
- 错误统一转换为消息，调用正常 settle。

验证：修复前 `npm run check` 8 项失败，修复后 8 项全部通过，覆盖竞态、重试、DTO、快照、空提交和销毁。

读取 reference：仅 `.frontend-architect/references/async-and-lifecycles.md`。

剩余风险：没有发现契约内未解决问题；验证范围为现有无依赖单元测试，未涉及实际网络或 UI。
