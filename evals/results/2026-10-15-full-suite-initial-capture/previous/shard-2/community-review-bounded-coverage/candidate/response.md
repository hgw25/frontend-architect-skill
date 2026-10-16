## 发现

- **高：Retry 发布了当前草稿，而不是失败请求的原始 payload。**  
  批准需求要求即使用户修改了草稿，Retry 仍重放失败时捕获的 title/category（[community.md:25](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/docs/community.md:25)）。控制器虽然保存了 `failedPayload`，但 `retry()` 实际再次读取 `draft.snapshot`（[publish.mjs:24](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/src/community/controllers/publish.mjs:24)）。定向复现中首次发送 `Release A/general`，修改草稿后 Retry 发送了 `Release B/beta`。受影响入口为 `createCommunity().publish`，实际 UI 消费者是 CreateForm 的 Retry 按钮（[CreateForm.tsx:13](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/src/community/ui/CreateForm.tsx:13)）。现有测试没有在两次请求之间编辑草稿，因此未发现该问题（[publish.test.mjs:5](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/test/publish.test.mjs:5)）。

- **中：回前台没有刷新 creator directory。**  
  批准需求要求同时刷新 feed 和 creator directory（[community.md:20](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/docs/community.md:20)）。运行时入口确实把 host foreground 事件接到 `onForeground(resources)`（[index.mjs:17](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/src/community/index.mjs:17)），但生命周期函数只调用 `feed.refresh()`（[lifecycle.mjs:1](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/src/community/lifecycle.mjs:1)），未调用已经存在的 `creatorDirectory.refresh()`（[creator-directory.mjs:6](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-3yuf7x3v/after/src/community/controllers/creator-directory.mjs:6)）。定向执行实际只产生 `["feed"]` 请求。

## 本轮结论范围

按本地 frontend-architect 的“需求—入口—消费者—证据”路径，仅审查了发布及回前台恢复：

- `node --test test/*.test.mjs`：10/10 通过，但缺少上述两个关键分支。
- 已确认恢复过程中 draft、favorites 保持不变，categories 实例不刷新，符合批准需求。
- React host 绑定和浏览器 harness 不在快照中，因此未验证宿主事件订阅及真实浏览器交互。
- 未审查列表交互、搜索、布局和格式化。
- 未修改任何文件；工作树保持干净。