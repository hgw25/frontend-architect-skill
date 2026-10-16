已完成可编译的最小实现：

- [api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fdfo723q/src/api.ts)：保留公开 API，增加 HTTP 状态及 `Profile` 响应结构校验。
- [ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fdfo723q/src/ProfileForm.tsx)：立即乐观显示新名称；失败回滚到最新权威值并提供重试；通过请求身份和版本避免旧响应覆盖新结果。
- [ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-fdfo723q/src/ProfileForm.test.tsx)：覆盖乐观显示、无效响应、并发回滚、乱序响应和失败值重试。

验证结果：`npm run check` 通过，TypeScript 类型检查通过，5/5 测试通过；`git diff --check` 通过。`.frontend-architect` 未修改。