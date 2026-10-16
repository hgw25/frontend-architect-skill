## 审查发现

1. **高：Retry 会发送编辑后的草稿，而不是失败时的原始载荷**

   [publish.mjs:24](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/src/community/controllers/publish.mjs:24) 虽然保存了 `failedPayload`，但第 26 行实际调用的是 `send(draft.snapshot)`。首次发布失败后，只要用户修改标题或分类再点 Retry，发送的就是新草稿，违反[需求第 28–29 行](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/docs/community.md:28)。

   运行探针确认发送序列为 `A/one`、`B/two`，而不是两次 `A/one`。现有[publish.test.mjs:11](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/test/publish.test.mjs:11) 在失败和重试之间没有编辑草稿，因此绿灯没有覆盖验收条件。

2. **高：新查询失败后会沿用旧游标，继续加载时混合两组查询结果**

   [feed.mjs:10](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/src/community/controllers/feed.mjs:10) 启动替换查询时保留原 `items` 和 `cursor`；失败分支仅写入 `error`。随后 [Feed.tsx:18](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/src/community/ui/Feed.tsx:18) 仍显示且启用 More 按钮。

   触发条件是：旧结果存在下一页游标，新搜索失败，然后用户点击 More。探针观察到第三个请求使用“新查询 + 旧游标”，最终列表变成旧结果与新查询分页结果的混合。这违反[需求第 6 行](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/docs/community.md:6)的“新查询重置分页”。现有测试只覆盖成功分页和并发查询，不覆盖替换失败后的分页。

3. **中：缺少 activity ID 的发布行仍显示为可用的 Get 按钮**

   [row-actions.mjs:6](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/src/community/ui/row-actions.mjs:6) 的禁用条件遗漏 `activityId`，与同文件实际执行动作时使用的 `canAcquire()` 规则不一致。对于 `published + unowned + activityId:null`，探针结果是 `detailHref:null`、`acquireDisabled:false`；用户得到一个可聚焦、可点击但没有效果的按钮。

   这直接违反[需求第 10–13 行](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/docs/community.md:10)。已通过的正常行截图和[row.test.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/test/row.test.mjs:4)都只使用完整 activity ID，无法暴露该问题。

4. **中：回到前台时没有刷新创作者目录**

   [lifecycle.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/src/community/lifecycle.mjs:1) 的前台恢复只调用 `feed.refresh()`，没有调用已经纳入 workspace 资源的 `creatorDirectory.refresh()`。探针调用 `community.onForeground()` 后，feed 请求次数为 1，creator 请求次数为 0。

   当创作者名称、头像或简介在后台期间发生变化时，目录会持续显示旧数据，违反[需求第 18、21 行](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/docs/community.md:18)。现有目录测试只验证显式 `refresh()`，没有经过 workspace 前台入口。

## 审查覆盖与证据缺口

- 验收依据采用 revision 2，并以 accepted 的 017、018 决策覆盖对应条款；019 是 draft，未作为要求。release notes 仅作为团队意图记录。
- 已审查完整 before/after diff、全部社区源文件、UI/CSS、7 个测试文件及需求/决策/验证记录。
- 实际执行 `node --test test/*.test.mjs`：10/10 通过；另用只读运行探针复现上述四项问题。未修改文件，工作树保持干净。
- 仓库没有 React host 或浏览器环境，因此“筛选条件实际写入/恢复分享 URL”、真实键盘与焦点行为、窄屏/缩放/长文本布局、宿主前台事件订阅均无法完成运行时验证。`parseQuery`/`writeQuery` 在快照内只有单元测试引用，是否由宿主正确接线仍是未闭合的验收项。
- [checks.md:11](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-mixed-diff-candidate-iqak98jx/after/docs/checks.md:11) 的状态登记不能证明 UI 状态已经在浏览器中通过；现有 Node 测试未挂载 React 组件。正常发布行截图也不覆盖无 activity ID、查询失败后分页、编辑后重试或目录前台恢复。