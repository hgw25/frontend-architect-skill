## 发现

1. **高：Retry 发布的是当前草稿，而不是失败时保存的载荷。**  
   需求要求即使用户修改草稿，Retry 仍重复失败的 title/category（[community.md:25](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/docs/community.md:25)）。控制器虽然保存了 `failedPayload`，但 `retry()` 实际调用 `send(draft.snapshot)`（[publish.mjs:24](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/src/community/controllers/publish.mjs:24)）。复现结果为首次发送 `Release A/general`，修改草稿后 Retry 发送了 `Release B/tools`。现有测试只检查尝试次数，没有在失败后修改草稿，因此未暴露问题（[publish.test.mjs:5](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/test/publish.test.mjs:5)）。

2. **中：回前台只刷新 feed，creator directory 会保持陈旧数据。**  
   `createCommunity` 已创建并公开 `creatorDirectory`，且实际入口把前台事件交给 `onForeground`（[index.mjs:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/src/community/index.mjs:9)）；但生命周期函数仅调用 `resources.feed.refresh()`（[lifecycle.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/src/community/lifecycle.mjs:1)）。这违反同时刷新 feed 和 creator directory 的批准要求（[community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-47p2g6kr/after/docs/community.md:20)）。入口级探针得到 `feed: 1, creators: 0`。

## 本轮结论

本轮仅审查了：

- 发布入口：`CreateForm → publish controller → api.publish`，以及草稿、分类和 Retry 消费者。
- 回前台入口：宿主订阅契约、`createCommunity.onForeground → lifecycle`，以及 feed、creator directory、草稿、收藏和分类状态。
- 需求来源：revision 2 第 4、5 节，以及已接受的 018 决策；未把草案 019 当作要求。

确认草稿、收藏以及会话内分类在当前回前台实现中能够保留。未审查列表其他交互、搜索、布局、格式化和行操作。

`node --test after/test/*.test.mjs` 共 10 项全部通过，但测试未覆盖上述两个失败条件。宿主 React 绑定不在快照中，因此无法确认它已适配新增的 `createCommunity(api, categoryLabels)` 参数及实际事件接线；浏览器行为也未验证。没有修改任何文件，工作区保持干净。