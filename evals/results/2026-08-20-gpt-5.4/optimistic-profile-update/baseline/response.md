已完成最小可编译修改，保留了现有 React + TypeScript 栈和 `updateProfile(displayName): Promise<Profile>` 的公开 API。

`src/api.ts` 现在会校验 HTTP 状态和响应结构，非法 payload 或非 2xx 会抛错，不再把坏数据静默透传。`src/ProfileForm.tsx` 增加了乐观显示、失败回滚和并发保护：提交后立即显示新名称；如果当前这次请求失败，就恢复到最近一次权威名称并显示 `Save failed. Please retry.`；如果用户快速连续提交，旧请求返回时会被忽略，不能覆盖更新的结果。

测试也同步补齐了最有价值的行为覆盖：保留了“保存中立即看到新名称”和“非法响应时回滚”的场景，并新增了“旧响应不会覆盖新提交”的用例，另外显式加了 `cleanup()` 保证测试隔离。相关文件是 [src/api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-wv5tndp0/src/api.ts), [src/ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-wv5tndp0/src/ProfileForm.tsx), [src/ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-wv5tndp0/src/ProfileForm.test.tsx)。

已验证：
- `npm run typecheck`
- `npm test`