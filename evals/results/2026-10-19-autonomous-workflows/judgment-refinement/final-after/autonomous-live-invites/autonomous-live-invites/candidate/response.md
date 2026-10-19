已完成团队邀请页的发送与列表操作。

- 发送成功即展示邀请与可访问确认；统计刷新失败不会误报发送失败。
- 发送期间保留用户新输入与焦点，Team note 不受影响。
- 列表仅本地重排，不请求服务；键盘操作后焦点留在同一邀请操作上。
- 补充实现设计与浏览器覆盖测试。

验证：`npm run check` — 6 项 Playwright 测试全部通过。

相关文件：[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-6cxlwk5a/src/app.mjs)、[设计记录](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-6cxlwk5a/docs/team-invitations-design.md)、[补充测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-6cxlwk5a/tests/invites-operations.spec.mjs)。