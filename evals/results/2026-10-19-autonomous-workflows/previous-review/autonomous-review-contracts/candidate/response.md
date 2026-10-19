## 审查发现

1. **高：Retry 发布了当前草稿，而不是失败时捕获的载荷。**  
   [`publish.mjs:24`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/controllers/publish.mjs:24>) 已保存 `failedPayload`，但重试仍调用 `send(draft.snapshot)`。实测首次提交标题 `A` 失败、编辑为 `B` 后重试，发送序列为 `A, B`，违反[需求](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/docs/community.md:25>)要求的“重复失败载荷”。应改为发送 `failedPayload`，并补充失败后编辑草稿再重试的断言；当前测试只检查尝试次数。

2. **高：缺少 activity ID 的已发布条目仍显示为可获取。**  
   [`row-actions.mjs:6`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/ui/row-actions.mjs:6>) 自行重写了部分资格规则，没有检查 `activityId`。因此 `activityId: null, status: published, owned: false` 得到 `acquireDisabled: false`，但点击后又被 `canAcquire` 静默拦截。应统一使用 `!canAcquire(post)`，并增加缺失 ID 的行操作测试。

3. **中：前台恢复没有刷新创作者目录。**  
   [`lifecycle.mjs:2`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/lifecycle.mjs:2>) 只调用 `feed.refresh()`，尽管 [`index.mjs:16`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/index.mjs:16>) 已把 `creatorDirectory` 纳入同一资源生命周期。这会让会话中变化的名称、头像和简介保持陈旧，违反[前台恢复要求](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/docs/community.md:20>)。应同时刷新两者，并测试前台事件覆盖目录。

4. **中：可分享筛选 URL 尚未接入运行时流程。**  
   [`query.mjs:2`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/query.mjs:2>) 提供了解析和序列化函数，但生产代码没有任何调用；[`Filters.tsx:7`](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-contracts-candidate-1x6jrjpu/after/src/community/ui/Filters.tsx:7>) 提交时也只触发普通回调。当前实现无法证明初始 URL、筛选提交或前进/后退会与查询同步。应在宿主绑定边界明确 URL 所有者并完成接线，再增加覆盖真实导航状态的集成测试。

## 验证与范围

- 已审查 `before/` → `after/` 的 34 个变更路径，以及需求、已接受决策和相关调用链。
- `node --test test/*.test.mjs`：10/10 通过，但现有测试没有暴露上述三个确定缺陷。
- 未包含 React 宿主和浏览器环境，因此键盘、布局、URL 导航及真实前台事件仍未验证。
- `createCommunity` 从单参数变为要求 `categoryLabels`；宿主调用方不在快照中，无法确认该公共入口迁移是否完成。
- 未修改任何文件，工作区保持干净。