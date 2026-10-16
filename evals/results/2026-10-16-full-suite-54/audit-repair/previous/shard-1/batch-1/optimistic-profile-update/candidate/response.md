已完成最小可编译修改：

- [ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fe8x4wx_/src/ProfileForm.tsx)：保存时立即乐观显示；失败回滚到最新确认值并提供 Retry；用请求序号阻止旧响应覆盖新结果。
- [api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fe8x4wx_/src/api.ts)：保留原有公开 API，新增 HTTP 状态检查和 `Profile` 响应运行时校验。
- [ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fe8x4wx_/src/ProfileForm.test.tsx)：覆盖乐观显示、回滚、原值重试、HTTP/响应结构失败、并发乱序响应。

验证通过：`npm run check`，TypeScript 编译成功，5/5 测试通过。`.frontend-architect` 未修改。