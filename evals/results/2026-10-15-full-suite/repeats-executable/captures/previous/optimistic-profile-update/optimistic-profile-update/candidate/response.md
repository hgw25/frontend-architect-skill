已完成可编译的最小修改，保持 React、TypeScript 与现有 `updateProfile(displayName)` API。

- [api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-_5e__0yt/src/api.ts)：新增请求类型、HTTP 状态检查与响应运行时校验。
- [ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-_5e__0yt/src/ProfileForm.tsx)：立即乐观展示；失败回滚最后确认值并显示可重试错误；请求序号确保旧成功或失败不会覆盖最新提交。
- [ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-_5e__0yt/src/ProfileForm.test.tsx)：补充乱序响应回归测试，并修正测试间 DOM 隔离。

本地 Skill 的“确认值、当前展示、请求身份分离”原则直接用于竞态处理。`.frontend-architect` 未修改。

验证结果：`npm run check` 通过，TypeScript 类型检查通过，4/4 测试通过；`git diff --check` 通过。