## 审查发现

1. **高：Retry 发布了当前草稿，而不是失败时冻结的 payload。**  
   [publish.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/src/community/controllers/publish.mjs:24) 虽然保存了 `failedPayload`，但第 26 行重新读取 `draft.snapshot`。实测首次提交 `Release A/general` 失败、随后编辑为 `Release B/tools`，Retry 的两次请求分别为 A 和 B。它违反了[批准需求](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/docs/community.md:25)中“重放失败 payload”的约束。现有[publish 测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/test/publish.test.mjs:11)只检查尝试次数，没有在失败后修改草稿或断言 payload。应让 Retry 调用 `send(failedPayload)`，并覆盖标题、分类都被编辑的场景。

2. **中：回前台只刷新 feed，creator directory 会保持陈旧。**  
   运行时入口已创建 `creatorDirectory` 并暴露 `onForeground`（[index.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/src/community/index.mjs:13)），目录控制器也有 `refresh()`（[creator-directory.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/src/community/controllers/creator-directory.mjs:6)），但 [lifecycle.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/src/community/lifecycle.mjs:1) 仍只调用 `feed.refresh()`。通过公开入口实测结果为 `feed: 1, creators: 0`，违反[前台恢复需求](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-ke0_8pb7/after/docs/community.md:20)。应并行刷新 feed 与 directory，并补入口级测试。

## 本轮结论

本轮共发现 2 个阻断批准需求的缺陷，因此这两条流程目前不应通过审查。

已确认回前台不会清除 draft/favorites，也没有刷新 categories；后者符合当前批准文档，`019 — Refresh categories` 仍是 Draft。全量 Node 测试为 10/10 通过，但未覆盖上述两个分支；仓库不含宿主浏览器绑定，因此未验证真实 foreground 事件和表单浏览器交互。

审查范围仅包括发布、回前台恢复、实际 `createCommunity` 入口及其直接消费者；未审查列表交互、搜索、布局和格式化。未修改任何文件，工作区保持干净。