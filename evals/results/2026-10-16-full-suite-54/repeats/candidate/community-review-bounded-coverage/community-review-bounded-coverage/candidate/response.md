## 发现

1. **高：Retry 会发布当前草稿，而不是失败时的载荷。**  
   [publish.mjs:14](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/controllers/publish.mjs:14) 已保存 `failedPayload`，但 [publish.mjs:26](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/controllers/publish.mjs:26) 的 Retry 重新读取 `draft.snapshot`。这直接违反批准需求 [community.md:26](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/docs/community.md:26)。复现结果：首次提交 `Release A/general` 失败，编辑为 `Release B/news` 后 Retry，第二次实际发布的是 B。受影响消费者是 [CreateForm.tsx:15](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/ui/CreateForm.tsx:15) 的 Retry 操作及最终 `api.publish` 调用。

2. **中：回前台只刷新 feed，没有刷新 creator directory。**  
   运行入口 [index.mjs:19](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/index.mjs:19) 将 host foreground 事件交给 `onForeground`，但 [lifecycle.mjs:2](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/lifecycle.mjs:2) 只调用 `feed.refresh()`。这违反 [community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/docs/community.md:20)，会让 [CreatorDirectory.tsx:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-nc4ws9a6/after/src/community/ui/CreatorDirectory.tsx:9) 继续展示过期姓名、头像或简介。探针确认 foreground 后调用计数为 `list: 1, creators: 0`。

## 本轮结论与范围

审查了实际入口 `createCommunity`，以及：

- 发布链路：`CreateForm → draft/publish controller → api.publish`
- 恢复链路：host foreground 回调 → `onForeground` → feed / creator directory
- 恢复期间应保留的 draft、favorites，以及不应刷新的 categories

本地测试共 10 项全部通过，但现有发布测试没有覆盖“失败后编辑再 Retry”，directory 测试也只直接调用 `refresh()`，没有覆盖 foreground 入口。React host 和浏览器 harness 不在快照中，因此实际订阅、解绑及表单浏览器行为未验证。

未审查其他列表交互、搜索、布局和格式化。未修改任何文件，工作区保持干净。