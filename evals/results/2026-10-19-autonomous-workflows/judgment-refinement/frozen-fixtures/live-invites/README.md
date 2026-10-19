# Team invitations

完成现有团队邀请页，使用原生 ESM 和当前 transport，不更换技术栈。
`src/data.mjs` 提供已加载的邀请及工作区统计。服务已由平台提供，本项目负责页面。

用户填写 Email，点击 Send invitation。服务返回邀请记录与发送编号，页面展示被接受的
邮箱和新邀请；一次提交只发送一次。失败时提供可理解的反馈，允许用户修改后重新提交。
Overview 展示工作区统计，发送后及 Refresh overview 操作会重新读取它；已有邀请与发送
回执不依赖统计是否可用，统计暂不可用时仍能继续使用页面并稍后重读。

Invitations 列表中的 Move earlier / Move later 只调整本页显示顺序，不产生服务请求。
连续使用键盘移动条目时，操作保持在同一邀请的同一按钮。发送期间用户可继续使用列表、
填写 Team note；请求完成不打断后续输入，Team note 草稿也不随列表或统计变化丢失。

已有公开界面：Email 输入框、Send invitation 按钮、Team note 文本框、名为 Invitations
的列表、每行的 `data-invite-id`、Refresh overview 按钮和 `data-testid="overview"` 的统计区。
发送反馈与错误须可被辅助技术读取。可调整布局与内部模块，保留这些消费者入口。

`src/transport.mjs` 的窄接口已处理 HTTP 状态：

- `sendInvitation(email)`：POST `/api/invitations`，JSON 请求 `{email}`，返回
  `{ invitation: {id, email, state}, receipt: {id, acceptedAt} }`。成功响应即代表已接受发送。
- `readOverview()`：GET `/api/overview`，返回 `{pending}`。

`npm run check` 使用 Chromium 和 HTTP 替身验证页面消费者的正常操作；不调用真实邮件服务。
