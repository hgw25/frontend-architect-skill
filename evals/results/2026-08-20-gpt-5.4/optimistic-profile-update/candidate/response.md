已完成最小可编译修改，保留了现有 React + TypeScript 栈和 `updateProfile` 公开 API。

核心调整在 [src/ProfileForm.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-sxsuqeup/src/ProfileForm.tsx) 和 [src/api.ts](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-sxsuqeup/src/api.ts)：提交时仍立即乐观显示新名称，但把服务器返回值作为唯一权威源；`api.ts` 现在会校验 `response.ok` 和返回体形状，失败或无效响应都会抛错。表单侧增加了“最新提交代次”保护，只有最后一次提交的结果才允许落地，因此快速重复提交时旧响应不会覆盖新结果；若最新请求失败，会把显示值和输入框都恢复到权威值，并显示可重试错误。

测试已同步更新到 [src/ProfileForm.test.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-sxsuqeup/src/ProfileForm.test.tsx)，覆盖了：
- 保存中立即看到新名称
- 返回体无效时回滚并报错
- 旧响应晚到时不会覆盖较新的成功结果

已运行校验：`npm run typecheck` 和 `npm test`，均通过。