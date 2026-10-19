已完成资料页保存与失败恢复。

- [ProfileForm.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-candidate-2y1vpobn/src/ProfileForm.tsx:19)：分离草稿、乐观展示和已确认资料；正确处理并发保存、乱序响应、回滚和重试。
- [api.ts](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-candidate-2y1vpobn/src/api.ts:7)：非成功 HTTP 状态和非法响应结构现在都会作为保存失败处理。
- 失败时恢复最新确认名称，保留用户草稿，并通过 `role="alert"` 提供可访问错误提示。
- 增加并发、草稿隔离、HTTP 失败及重试测试，并补齐 Vitest DOM 清理配置。
- 按本地 frontend-architect Skill 编写了[技术设计](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-candidate-2y1vpobn/docs/profile-save-design.md:1)，明确异步发布与回退规则；`.frontend-architect` 保持未修改。

验证结果：`npm run check` 通过，2 个测试文件共 7 条测试全部成功；`git diff --check` 通过。