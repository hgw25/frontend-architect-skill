已完成最小可编译修改，保留了现有 React + TypeScript 栈和 `updateProfile(displayName: string): Promise<Profile>` 公开 API。

核心变更在 [src/ProfileForm.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-2p4_2qm5/src/ProfileForm.tsx) 和 [src/api.ts](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-2p4_2qm5/src/api.ts)。表单现在维护“已确认的权威资料”与“最新待提交请求”两层状态：保存后立即显示新名称；失败时回滚到当前权威值并显示 `Save failed. Please retry.`；重复快速提交时，旧响应不能覆盖较新的结果。API 边界现在会对非 `2xx` 响应和非法返回体做校验并抛错，避免脏数据进入组件状态。

测试也同步更新了，在 [src/ProfileForm.test.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-2p4_2qm5/src/ProfileForm.test.tsx) 增加了“旧成功响应晚到时仍保持最新提交可见”的行为覆盖，并补了每个用例后的 DOM 清理，防止串测。

已验证：
- `npm test` 通过
- `npm run typecheck` 通过