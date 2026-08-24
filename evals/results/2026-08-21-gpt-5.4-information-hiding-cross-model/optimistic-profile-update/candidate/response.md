已完成最小可编译修改，保留了现有 React + TypeScript 技术栈和 `updateProfile(displayName)` 公开 API。

关键实现是把资料编辑拆成三个明确事实：输入草稿、权威资料、当前乐观展示。`[src/ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-y2u551_d/src/ProfileForm.tsx)` 现在会在保存时立即显示新名称；如果请求失败或响应结构无效，会回退到最后一个权威名称并显示 `Save failed. Please retry.`；同时用递增提交序号忽略过期响应，避免旧请求晚到时覆盖新结果。`[src/api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-y2u551_d/src/api.ts)` 补了 API 边界校验，非 2xx 和非法 payload 都会明确抛错。

测试也同步更新到了最有价值的可观察行为：保留了“保存中立即看到新名称”和“非法成功响应要回滚”，并新增“快速重复提交时旧响应不能覆盖新结果”。相关测试在 `[src/ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-y2u551_d/src/ProfileForm.test.tsx)`。

已验证：`npm run check` 通过。