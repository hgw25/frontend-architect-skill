## 审查发现

1. **高：Retry 发送了当前草稿，而非失败时的 payload。**  
   控制器已在失败时保存 `failedPayload`，但 `retry()` 实际重新读取 `draft.snapshot`。用户修改标题或分类后重试，会发布新草稿，违反批准需求。[publish.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/controllers/publish.mjs:24>) [需求](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/docs/community.md:25>)  
   定向复现得到两次载荷分别为 `Release A/general` 和 `Release B/preview`。现有测试未在失败和重试之间编辑草稿，因此没有捕获该问题。[publish.test.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/test/publish.test.mjs:5>)

2. **高：回前台只刷新 feed，没有刷新 creator directory。**  
   实际入口已经创建并传入 `creatorDirectory`，但生命周期处理只调用 `resources.feed.refresh()`。[index.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/index.mjs:13>) [lifecycle.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/lifecycle.mjs:1>)  
   定向复现中 feed 调用 1 次、creators 调用 0 次，与“二者均刷新”的要求不符。[需求](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/docs/community.md:20>)

3. **中：发布命令入口未落实非空标题约束。**  
   `CreateForm` 会禁用空标题按钮，但实际暴露的 `publish.submit()` 不校验标题，空白标题仍会到达 `api.publish`。[CreateForm.tsx](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/ui/CreateForm.tsx:12>) [publish.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/controllers/publish.mjs:23>)  
   定向调用确认 `"   "` 被发送，说明 UI 与命令边界对同一业务规则不一致。

## 入口与消费者风险

`createCommunity` 从原来的单参数入口变成需要 `categoryLabels`，并立即执行 `labels.map`。[before/index.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/before/src/community/index.mjs:6>) [after/index.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/index.mjs:9>) [categories.mjs](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-community-review-bounded-coverage-candidate-mytpuhkg/after/src/community/controllers/categories.mjs:1>)  
旧调用方式会直接抛出 `TypeError`。宿主消费者不在快照内，因此无法确认它是否已同步迁移；现有结构测试只检查函数存在，没有实例化入口。

## 本轮结论范围

依据 revision 2 和已接受的 017/018 决策，按本地 Skill 的“需求—入口—消费者—证据”路径，仅审查了发布与回前台恢复。草案 019 未作为需求；列表交互、搜索、布局和格式化未审查。

`node --test after/test/*.test.mjs` 共 10 项全部通过，但缺少“编辑后重试”和“通过实际前台入口刷新目录”的覆盖。已确认 pending 去重、提交时载荷快照、新草稿保留，以及草稿/收藏在恢复时不被清除。宿主浏览器绑定不在快照中，未验证。未修改任何文件，工作区保持干净。