已完成最小可编译修改，保留了现有 React + TypeScript 栈和 `updateProfile(displayName)` 公开 API。

在 [src/api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-z7baw50p/src/api.ts:1) 我把 API 边界收紧为“只在返回合法 `Profile` 且 `response.ok` 时成功”，无效 shape 和非 2xx 都会抛错。  
在 [src/ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-z7baw50p/src/ProfileForm.tsx:1) 我加入了权威资料状态、保存失败回滚、可重试错误提示，以及基于提交序号的竞态保护：保存后立即显示新名字；失败时恢复最后确认的权威值；旧请求晚到时不会覆盖更新后的结果。  
在 [src/ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-baseline-z7baw50p/src/ProfileForm.test.tsx:1) 我补了最有价值的竞态测试，并保留/修复了失败回滚测试。

已运行检查并通过：`npm run typecheck`、`npm test`。