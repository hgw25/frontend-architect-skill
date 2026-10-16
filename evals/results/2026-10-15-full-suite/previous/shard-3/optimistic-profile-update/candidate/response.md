已完成最小可编译修改，保留 React、TypeScript 和现有 `updateProfile(displayName)` API。

- [api.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-uxq7iqn_/src/api.ts:7)：新增请求类型，检查 HTTP 状态，并在边界验证响应结构。
- [ProfileForm.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-uxq7iqn_/src/ProfileForm.tsx:5)：区分已确认值、最新乐观提交和失败提交；通过请求序号阻止旧成功/失败覆盖新结果；失败时回滚到最新确认值并提供 Retry。
- [ProfileForm.test.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-optimistic-profile-update-candidate-uxq7iqn_/src/ProfileForm.test.tsx:14)：覆盖即时展示、非法响应回滚、重叠保存回滚、乱序响应及失败重试。

验证：

- 生产代码严格 TypeScript 编译通过。
- `git diff --check` 通过。
- 完整 `npm run check` 未能执行：工作区没有已安装依赖，`npm ci` 被沙箱网络策略阻止（连接 npm 代理时报 `EPERM`）。
- `.frontend-architect` 未修改。