已完成最小可编译修改，保留了现有 React + TypeScript 技术栈和 `updateProfile(displayName): Promise<Profile>` 公开 API。

关键改动在于把资料编辑的显示逻辑收敛成“权威值 + 最新一次乐观提交”模型：[`src/ProfileForm.tsx`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-j4dp1qxx/src/ProfileForm.tsx) 现在会在提交后立刻显示新名称；如果最新请求失败，会回退到最近一次已确认的权威资料并显示 `Save failed. Please retry.`；旧请求即使晚到，也只会在它仍是最新已确认提交时更新权威值，不能覆盖更晚提交的结果。[`src/api.ts`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-j4dp1qxx/src/api.ts) 补上了 HTTP 状态和响应 shape 的运行时校验，非法响应会按失败路径处理。

测试也同步更新了：[`src/ProfileForm.test.tsx`](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-j4dp1qxx/src/ProfileForm.test.tsx) 现在覆盖了乐观显示、非法响应回滚、最新提交失败时回退到先前确认值，以及旧成功响应晚到时不覆盖新结果这几个最有价值的行为。

已验证：
- `npm run typecheck`
- `npm test`