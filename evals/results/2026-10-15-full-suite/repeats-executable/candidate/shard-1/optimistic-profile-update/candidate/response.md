已完成最小可编译修改，保留现有 React、TypeScript 与公开 API。

- [api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-0eiukv18/src/api.ts:7)：补充更新类型、HTTP 状态检查及响应结构校验。
- [ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-0eiukv18/src/ProfileForm.tsx:5)：实现即时乐观展示、按服务器版本维护权威值、失败回滚和精确重试；旧请求不会覆盖较新结果。
- [ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-0eiukv18/src/ProfileForm.test.tsx:15)：覆盖乐观更新、无效响应、并发回滚、乱序响应和重试行为。

验证结果：

- `npm run check`：通过
- TypeScript 类型检查：通过
- Vitest：5/5 通过
- `git diff --check`：通过
- `.frontend-architect` 未修改。