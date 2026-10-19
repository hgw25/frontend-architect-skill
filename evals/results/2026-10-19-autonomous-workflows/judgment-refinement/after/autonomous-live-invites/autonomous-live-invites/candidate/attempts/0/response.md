已完成团队邀请页的发送与列表操作。

主要改动：

- 发送成功后立即展示新邀请、确认邮箱及回执编号。
- 统计刷新失败不会误报发送失败或移除已接受邀请。
- 请求期间可继续编辑 Email 和 Team note，完成后不覆盖输入、不抢焦点。
- 防止同一次提交重复发送。
- 列表排序纯本地完成，不发起服务请求。
- 连续键盘排序时焦点保持在同一邀请的同一按钮。
- 为发送、统计刷新分别提供可访问的状态和错误反馈。
- 完善响应式布局、焦点样式及高对比度支持。

关键文件：

- [页面实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-orchk53l/src/app.mjs)
- [页面样式](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-orchk53l/src/style.css)
- [技术设计](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-orchk53l/docs/team-invitations-design.md)
- [新增边界测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-invites-candidate-orchk53l/tests/invites.additional.spec.mjs)

验证结果：

- `npm run check`：7 项 Chromium 测试全部通过。
- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- 原有只读测试和数据、transport、配置文件均未修改。