## 审查发现

1. **P1 — 运行时入口存在向后不兼容的启动崩溃**

   [index.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/index.mjs:9) 将入口从 `createCommunity(api)` 改为依赖 `categoryLabels`，随后 [categories.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/controllers/categories.mjs:2) 无条件执行 `labels.map(...)`。任何仍按 [before 入口](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/before/src/community/index.mjs:6) 传一个参数的现有宿主都会在创建 workspace 时同步崩溃。

   只读复现：`createCommunity({})` 得到 `TypeError: Cannot read properties of undefined (reading 'map')`。快照没有宿主调用方迁移或新参数契约，现有结构测试也只检查函数存在，没有实例化入口。若外部宿主已同步迁移，此项影响可解除，但当前提交无法证明。

2. **P1 — Retry 发布的是编辑后的草稿，而不是失败 payload**

   [publish.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/controllers/publish.mjs:24) 虽然保存了 `failedPayload`，但重试实际调用的是 `send(draft.snapshot)`。这直接违反 [当前发布要求](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/docs/community.md:25)。

   触发条件：提交 A 失败，用户把标题或分类改成 B，再点击 Retry。实测发送序列为 A、B，而不是 A、A；用户可能在“重试旧发布”的语义下发布了新内容。[现有测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/test/publish.test.mjs:5) 在两次调用间没有编辑草稿，因此仍会通过。

3. **P1 — 新查询失败后保留旧 cursor，可把旧分页游标用于新查询**

   [feed.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/controllers/feed.mjs:8) 启动替换查询时只更新 loading/error，没有重置 `items` 和 `cursor`；只有请求成功后才覆盖它们。失败后 [loadMore()](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/controllers/feed.mjs:28) 仍会使用旧 cursor，与新 query 组合请求，违反“新查询重置分页并拥有后续响应”的 [发现页契约](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/docs/community.md:3)。

   只读复现：旧查询 cursor 为 `old-next`，新查询失败后 snapshot 仍保留该 cursor；随后发出的请求为 `{title:"new", cursor:"old-next"}`。同时旧结果仍以新查询的页面状态显示。[现有 feed 测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/test/feed.pending.test.mjs:24) 只覆盖成功分页。

4. **P2 — 前台恢复没有刷新 creator directory**

   [lifecycle.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/lifecycle.mjs:1) 的 `onForeground` 只调用 `feed.refresh()`，尽管 [运行时入口](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/index.mjs:16) 已把 `creatorDirectory` 交给它。与 [前台恢复要求](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/docs/community.md:20) 不符。

   触发条件：应用退到后台期间创作者名称、头像或简介发生变化，再回到前台。目录继续显示旧数据，直到其他路径手动刷新。只读探针记录的调用只有 `["feed"]`。

5. **P2 — 缺少 activity ID 的 published 行仍把 Get 显示为可用**

   [row-actions.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/src/community/ui/row-actions.mjs:6) 自行用 `owned/status` 计算 disabled，遗漏 activity ID；同文件实际执行时又通过 `canAcquire()` 检查 ID。结果是按钮看似可点击但点击无效果，违反 [Release rows 要求](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/docs/community.md:9)。

   实测 `{activityId:null,status:"published",owned:false}` 得到 `detailHref:null`、`acquireDisabled:false`。已通过的截图和 [row 测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/test/row.test.mjs:4) 都只使用完整 activity ID，未覆盖该分支。

## 验收依据与覆盖范围

当前有效依据为 revision 2 的 [community.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-c65dl2w9/after/docs/community.md:1)，以及索引中 accepted 的 017、018 决策。017 已合法撤销 release-row creator 链接要求；019 仍是 draft，不作为验收条件。`release-notes.md` 仅作为团队记录，没有替代需求。

审查覆盖了 34 个变更文件，并追踪了受新需求影响但未出现在 diff 中的 `policy.mjs`、`lifecycle.mjs`。仓库声明的 Node 快速测试已实际运行，10/10 通过；工作区保持 clean，未修改文件。

宿主 React 工程、构建配置和浏览器 harness 不在快照内，因此以下仍未验证：筛选条件与真实 URL/history 的绑定、浏览器键盘与焦点行为、窄屏/长标题布局、收藏后的可视反馈，以及宿主是否已迁移新的 `createCommunity` 参数。正常 published 且 activity ID 完整的行截图按用户提供的信息视为已通过，但不覆盖上述异常分支。