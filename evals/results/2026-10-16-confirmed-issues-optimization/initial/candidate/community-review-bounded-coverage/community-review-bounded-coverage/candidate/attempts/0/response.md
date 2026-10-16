## 发现

1. **高：Retry 发布了当前草稿，而非失败时的载荷。**  
   控制器虽保存 `failedPayload`，但 `retry()` 又读取 `draft.snapshot`：[publish.mjs:24](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/src/community/controllers/publish.mjs:24)。这违反批准需求：[community.md:27](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/docs/community.md:27)。实测首次提交 `Release A/general` 失败后，将草稿改为 `Release B/news` 再重试，第二次发送的是 `Release B/news`。现有测试只检查调用次数，未在重试前修改草稿：[publish.test.mjs:11](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/test/publish.test.mjs:11)。

2. **中：回前台只刷新 feed，creator directory 会保留过期数据。**  
   实际入口把前台事件委托给 `onForeground`：[index.mjs:19](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/src/community/index.mjs:19)，但生命周期实现只调用 `resources.feed.refresh()`：[lifecycle.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/src/community/lifecycle.mjs:1)。批准需求明确要求同时刷新 feed 和 creator directory：[community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ss25ocr1/after/docs/community.md:20)。入口级探针仅记录到 `feed`；当前测试也未覆盖前台恢复。

## 本轮结论

本轮不通过，共有两项明确的需求偏差。仓库测试为 10/10 通过，但未暴露上述场景。已确认前台恢复不会清除草稿、收藏或刷新分类。

审查范围仅覆盖发布、回前台恢复、运行入口及直接消费者。宿主 React 的前台事件绑定和浏览器行为不在快照中，无法验证；列表交互、搜索、布局及格式化未审查。未修改任何文件。