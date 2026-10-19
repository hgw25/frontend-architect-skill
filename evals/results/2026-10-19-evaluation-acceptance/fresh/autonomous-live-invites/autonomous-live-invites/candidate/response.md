已完成团队邀请页的发送、概览刷新和列表操作。

- 发送成功会展示新邀请与可访问的确认消息；概览刷新失败不会误报发送失败。
- 列表移动仅更新本地顺序，并保持键盘焦点在同一邀请的同一操作按钮。
- 异步发送完成不会打断用户后续输入的 Team note。
- 保留既有消费者入口与 transport 技术栈。

主要实现见 [app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-zb6i4q4a/src/app.mjs)，设计与验证记录见 [team-invitations-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-zb6i4q4a/docs/team-invitations-design.md)。

验证：`npm run check` 通过，6/6 Playwright 测试通过。