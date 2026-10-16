## 发现

1. **高：Retry 会发布编辑后的草稿，而非失败时的原始载荷。**  
   需求明确要求 Retry 重放失败提交的 title 和 category，即使用户随后修改草稿（[community.md](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/docs/community.md:25>)）。控制器虽在失败时保存 `failedPayload`，但 `retry()` 实际再次读取 `draft.snapshot`（[publish.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/src/community/controllers/publish.mjs:24>)）。  
   复现结果：首次发送 `Release A/general`，失败后改为 `Release B/tools`，Retry 发送了 `Release B/tools`。这可能把用户尚未准备提交的新草稿意外发布。应让 Retry 调用 `send(failedPayload)`，并补充修改草稿后比较两次完整载荷的测试。现有测试没有修改草稿，只验证了请求次数（[publish.test.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/test/publish.test.mjs:5>)）。

2. **中：回到前台时没有刷新 creator directory。**  
   运行时入口将 host 前台事件委托给 `onForeground(resources)`（[index.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/src/community/index.mjs:17>)），但该函数只调用 `feed.refresh()`（[lifecycle.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/src/community/lifecycle.mjs:1>)）。这违反了 feed 和 creator directory 都应恢复刷新的要求（[community.md](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/docs/community.md:20>)），导致目录 UI 继续显示过期姓名、头像或简介。  
   实际入口探针得到 `feed=1, creators=0`。目录控制器已有可复用的 `refresh()`（[creator-directory.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-7_88qxd_/after/src/community/controllers/creator-directory.mjs:6>)），应在同一恢复入口调用，并通过 `createCommunity().onForeground()` 测试两个消费者，而非仅测试目录独立刷新。

## 本轮结论与范围

审查链路包括：

- 发布：`CreateForm` 的 Submit/Retry 消费者 → publish controller → draft snapshot → `api.publish`
- 回前台恢复：host foreground subscription → `createCommunity().onForeground()` → feed 与 creator-directory 消费者
- 同时确认恢复入口没有重建或清空 draft、favorites、categories，符合本轮相关要求

批准依据为 revision 2 的发布与前台恢复章节，以及 accepted decision 018；release notes 未作为验收依据。列表交互、搜索、布局、格式化及其他行行为均未审查。

执行 `node --test test/*.test.mjs`，10/10 通过，但上述两个关键分支均不在现有覆盖内。快照没有包含 React host 绑定或浏览器环境，因此未验证真实 host 订阅和 UI 行为。未修改任何文件，工作区保持干净。