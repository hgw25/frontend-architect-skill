已完成团队邀请页的发送与列表操作。

- 发送成功立即展示新邀请与回执确认；统计刷新失败不会误报为发送失败。
- 防止发送期间重复提交，并保留用户等待期间新输入的邮箱草稿。
- 列表移动仅更新本地顺序；重绘后键盘焦点保持在同一邀请的同一操作按钮。
- Team note 在发送、排序和统计刷新后均保留。
- 添加技术设计文档：[team-invitations-design.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-blewm0qs/docs/team-invitations-design.md)
- 添加异常恢复与焦点保持的浏览器测试。

验证：`npm run check` 通过，5 个 Chromium 用例全部通过。