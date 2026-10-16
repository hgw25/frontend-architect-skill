## 审查发现

1. **高：发布 Retry 使用了当前草稿，而不是失败时捕获的载荷。**

   [publish.mjs:14](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/controllers/publish.mjs:14) 保存了 `failedPayload`，但 [publish.mjs:24](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/controllers/publish.mjs:24) 的 `retry()` 实际调用 `send(draft.snapshot)`。

   触发条件：首次发布失败后，用户修改标题或分类，再点击 Retry。最小复现得到两次请求载荷：

   ```text
   {"title":"A","category":"one"}
   {"title":"B","category":"two"}
   ```

   这直接违反 [community.md:26](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/docs/community.md:26) 要求，可能发布用户尚未打算提交的新草稿。现有 [publish.test.mjs:5](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/test/publish.test.mjs:5) 在失败和重试之间没有编辑草稿，因此测试全绿也检测不到该问题。

2. **中：回到前台时创作者目录不会刷新。**

   [lifecycle.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/lifecycle.mjs:1) 的恢复流程只调用 `resources.feed.refresh()`，没有调用已存在的 `creatorDirectory.refresh()`。

   触发条件：工作区进入后台期间，创作者名称、头像或简介发生变化，随后工作区回到前台。目录继续显示旧数据，违反 [community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/docs/community.md:20)。运行级复现结果为 `{"feed":1,"directory":0}`。当前测试只有目录独立加载测试，没有覆盖工作区恢复编排。

3. **中：缺少 activity ID 的已发布条目仍显示可用的 Get 按钮。**

   [row-actions.mjs:6](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/ui/row-actions.mjs:6) 只按 `owned` 和 `status` 计算禁用状态，没有考虑 `activityId`；但下一行点击处理又通过 `canAcquire()` 检查 ID。这导致展示规则与执行规则不一致。

   触发条件：`status: "published"`、`owned: false`、`activityId: null`。复现结果是 `detailHref: null`、`acquireDisabled: false`，按钮可点击但没有任何响应，违反 [community.md:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/docs/community.md:9)。上一轮截图明确只覆盖完整 activity ID，且 [row.test.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/test/row.test.mjs:4) 同样只测试有效 ID，未覆盖此分支。

4. **中：交付快照内没有把状态筛选接入可分享 URL。**

   [query.mjs:2](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/query.mjs:2) 提供了解析和写入函数，但源代码中没有调用者；唯一 importer 是格式化单测。[Filters.tsx:3](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/ui/Filters.tsx:3) 也只向外调用普通回调，而声明的 [index.mjs:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/src/community/index.mjs:9) runtime entry 没有 URL 初始化或同步契约。

   触发条件：用户选择 `unavailable` 或 `all` 后刷新、复制或分享页面。就当前交付物而言，没有代码确保 URL 记录筛选或从 URL 恢复筛选，因此 [community.md:3](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-t48rxibo/after/docs/community.md:3) 不能验收通过。如果该连接实际位于未提供的宿主代码，需要用那部分代码重新核验。

## 审查覆盖

- 当前验收依据：revision 2 产品要求，以及已接受的决策 017、018；草案 019 和 release notes 未作为需求。
- 对比并检查了 34 个变更文件，同时追踪了无 diff 但承担新需求的 `lifecycle.mjs`、共享行规则和 runtime entry。
- 覆盖 discovery/query/pagination、行操作、目录与路由、前台恢复、发布/草稿、收藏、分类、格式化、API 和测试。
- 执行 `node --test test/*.test.mjs`：10/10 通过；另用三个最小运行用例确认了上述 Retry、目录刷新和缺失 activity ID 问题。
- 未提供 React 宿主、浏览器 harness、截图原件及 UI 构建/typecheck 配置，因此未重新验证键盘、焦点、实际布局、URL history 集成和 TSX 宿主接线。正常发布行截图按团队记录视为已通过，但不覆盖发现 3 的缺失-ID 条件。
- 未修改任何文件；工作区保持干净。