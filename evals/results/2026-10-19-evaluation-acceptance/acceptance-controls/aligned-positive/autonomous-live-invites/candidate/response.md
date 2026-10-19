已完成团队邀请页交互。

- 发送、失败重试、成功回执与概览刷新已分离；概览失败不会覆盖已接受的邀请。
- 异步发送期间的 Email 与 Team note 编辑会保留。
- 列表仅本地重排，键盘连续操作会保持在同一邀请按钮上。
- 新增设计记录与浏览器回归测试。

验证：`npm run check` 通过，7/7 Playwright 测试成功。

相关文件：[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-420e2gji/src/app.mjs)、[交互设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-420e2gji/docs/team-invitations-design.md)、[新增测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-420e2gji/tests/invites-interactions.spec.mjs)。