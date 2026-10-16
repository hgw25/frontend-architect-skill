共发现 3 个行为缺陷和 1 个验证记录问题；未修改任何文件。

## 发现

1. **高：Retry 会发布编辑后的草稿，而不是失败时捕获的内容**

   [publish.mjs:14](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/src/community/controllers/publish.mjs:14) 保存了 `failedPayload`，但 [publish.mjs:26](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/src/community/controllers/publish.mjs:26) 重试时仍发送 `draft.snapshot`。

   触发条件：提交 A/general 失败，用户把草稿改成 B/news 后点击 Retry。实际请求序列为：

   ```json
   [{"title":"A","category":"general"},{"title":"B","category":"news"}]
   ```

   这违反“重试失败时已提交的 payload”的明确要求（[community.md:26](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/docs/community.md:26)）。现有测试没有修改草稿，也没有断言请求内容（[publish.test.mjs:11](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/test/publish.test.mjs:11)）。

2. **中：工作区回到前台时不会刷新创作者目录**

   `creatorDirectory` 已纳入工作区资源（[index.mjs:13](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/src/community/index.mjs:13)），但前台恢复只调用 feed（[lifecycle.mjs:2](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/src/community/lifecycle.mjs:2)）。

   触发条件：应用在后台期间创作者名称、头像或简介发生变化。回到前台后目录继续显示旧数据，违反 [community.md:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/docs/community.md:20)。运行探针只观察到 `["feed"]`。目录测试仅验证直接调用 `refresh()`，没有覆盖前台恢复集成路径。

3. **中：缺少 activity ID 的已发布行仍显示可用的 Get 按钮**

   [row-actions.mjs:6](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/src/community/ui/row-actions.mjs:6) 的禁用条件遗漏了 `activityId`；下一行的点击处理却通过 `canAcquire` 拒绝该操作。

   触发条件：`status: "published"`、`owned: false`、`activityId: null`。实际状态为 `detailHref: null`、`acquireDisabled: false`，点击后无调用，形成可聚焦、可点击但无响应的按钮，违反 [community.md:9](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/docs/community.md:9)。现有行测试仅覆盖完整 activity ID 和 owned 两种情况；上一轮正常截图同样使用完整 activity ID。

4. **低：验证记录把未实际验证的 error/empty UI 状态登记为已覆盖**

   [checks.md:11](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/docs/checks.md:11) 声称 `feed.pending.test.mjs` 覆盖 loading、error 和 empty。实际测试中的错误是应被忽略的旧请求错误，并明确断言 `error === null`；“empty”也只断言控制器数组为空，没有渲染或检查空态反馈（[feed.pending.test.mjs:15](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-5r0qbx0f/after/test/feed.pending.test.mjs:15)）。因此该记录不能支撑 presentation 状态已经验收的结论。

## 审查覆盖

- 当前验收依据：revision 2 产品要求，以及已接受的 017、018 决策；019 仍是草案，未作为要求。
- 检查了 before/after 的全部 34 个差异路径，并追踪了受影响的 `policy`、`lifecycle`、控制器、UI、测试及团队记录。
- 实际运行 `node --test test/*.test.mjs`：10/10 通过；另以三个最小运行探针复现上述行为缺陷。
- 快照不含宿主应用和浏览器环境，因此未验证 URL 与浏览器历史的真实接线、键盘/焦点行为、窄屏长标题布局及缺失 activity ID 的视觉状态。已接受上一轮正常发布行截图，但其数据条件不覆盖第 3 项。
- 工作区保持干净，未改动 fixture 或 Skill 文件。