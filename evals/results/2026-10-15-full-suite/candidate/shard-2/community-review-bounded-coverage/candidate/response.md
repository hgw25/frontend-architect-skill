本轮结论：发现 2 个需求不符合项，发布与回前台恢复流程尚不能通过审查。未修改任何文件。

### 发现

1. **高：Retry 发布了当前草稿，而不是失败时的原载荷。**

   发布失败时已经把原载荷保存到 `failedPayload`，但 `retry()` 又读取了 `draft.snapshot`：[publish.mjs:24](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/src/community/controllers/publish.mjs:24)。这违反“即使草稿已编辑，重试仍重复失败载荷”的批准要求：[community.md:25](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/docs/community.md:25)。

   实际复现：首次发送 `{Release A, general}` 失败，随后改成 `{Release B, tools}` 并 Retry，第二次请求发送了 `{Release B, tools}`。受影响消费者是 [CreateForm.tsx:15](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/src/community/ui/CreateForm.tsx:15) 的 Retry 操作。

   现有测试只验证请求次数和错误清除，没有在失败后编辑草稿，也没有断言请求载荷：[publish.test.mjs:5](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/test/publish.test.mjs:5)。

2. **中：回前台仅刷新 feed，没有刷新 creator directory。**

   `createCommunity()` 已创建并暴露目录控制器，但 `onForeground()` 的刷新集合仍只有 feed：[lifecycle.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/src/community/lifecycle.mjs:1)。这违反“回前台刷新 feed 和 creator directory”的要求：[community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/docs/community.md:20)。

   通过实际运行时入口 [index.mjs:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/src/community/index.mjs:9) 触发恢复，观察到 `feedCalls=1`、`creatorCalls=0`。目录测试仅直接调用目录自身的 `refresh()`，未经过前台恢复入口：[directory.test.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ibunvubl/after/test/directory.test.mjs:4)。

### 范围与验证

审查链路限定为：

- 发布：`CreateForm → publish controller → api.publish`
- 恢复：宿主前台事件 → `createCommunity().onForeground() → feed / creatorDirectory`

确认正常的范围内行为包括：pending 发布去重、成功发布不覆盖更新后的草稿，以及恢复期间草稿、收藏、分类快照保持不变。

`node --test after/test/*.test.mjs` 的 10 项测试全部通过，但未覆盖上述两个失败条件。快照不包含 React 宿主和浏览器 harness，因此未验证宿主是否正确订阅/解绑前台事件及 UI props 接线。列表交互、搜索、布局和格式化均未纳入结论。工作区保持干净。