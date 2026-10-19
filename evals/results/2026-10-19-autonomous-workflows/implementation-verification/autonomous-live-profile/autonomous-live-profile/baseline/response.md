已完成资料页保存与失败恢复：

- 保存时立即乐观展示新名称。
- 校验 HTTP 状态及响应数据结构。
- 保存失败时恢复最近已确认资料，并显示可访问的错误提示。
- 正确处理重叠保存，旧响应不会覆盖较新的编辑。
- 保留失败草稿，用户可直接重试。
- 补充 Vitest 用例间 DOM 清理配置，避免测试互相污染。
- 未修改 `package.json`、`package-lock.json` 或既有测试。

主要修改：

- [ProfileForm.tsx](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-baseline-ktlgpovp/src/ProfileForm.tsx)
- [api.ts](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-baseline-ktlgpovp/src/api.ts)
- [vitest.config.ts](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-profile-baseline-ktlgpovp/vitest.config.ts)

验证结果：`npm run check` 通过，TypeScript 检查及 3 个测试全部通过。