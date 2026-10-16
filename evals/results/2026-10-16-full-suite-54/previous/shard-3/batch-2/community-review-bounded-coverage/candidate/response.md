## 发现

1. **高：Retry 发布了当前草稿，而不是失败提交时的 payload。**  
   批准需求要求编辑草稿后重试仍复用原 title/category（[community.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/docs/community.md:25)）。控制器虽保存 `failedPayload`，但 `retry()` 实际重新读取 `draft.snapshot`（[publish.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/src/community/controllers/publish.mjs:24)）。实测首次提交 `Release A/general` 失败、草稿改为 `Release B/beta` 后，Retry 发送的是 `Release B/beta`。现有测试未在失败后修改草稿，因此没有暴露问题（[publish.test.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/test/publish.test.mjs:5)）。

2. **中：回前台没有刷新 creator directory。**  
   批准需求要求同时刷新 feed 和 creator directory（[community.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/docs/community.md:20)）。实际入口已创建并传入 `creatorDirectory`（[index.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/src/community/index.mjs:13)），但恢复函数只调用 `feed.refresh()`（[lifecycle.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-9okg7ld8/after/src/community/lifecycle.mjs:1)）。探针结果为 `feed=1, creators=0`。当前测试也没有覆盖 `createCommunity().onForeground()`。

## 本轮结论与范围

本轮结论：`after/` 在这两条流程上尚不能通过审查，需修复以上两个批准需求偏差。

已核对：

- 发布：`CreateForm → publish controller → draft → API`。
- 回前台：`createCommunity → onForeground → feed/creator directory`，以及 draft、favorites、categories 的恢复影响。
- 正常发布能冻结提交快照、防止 pending 重复，并保留之后编辑的新草稿。
- 回前台后 draft 和 favorites 保留，categories 未刷新，符合要求。
- `node --test test/*.test.mjs`：10/10 通过，但不足以覆盖上述两个失败条件。

未核对列表交互、搜索、布局与格式化本身。快照不包含 React host 和浏览器环境，因此未验证真实前台事件订阅及表单浏览器交互。未修改任何文件。