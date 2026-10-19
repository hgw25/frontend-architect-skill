# 团队邀请页：发送与列表操作设计

## 事实与目标

`src/data.mjs` 提供页面首次加载时的邀请和统计；`src/transport.mjs` 是唯一的服务边界：
`sendInvitation(email)` 接受一次发送并返回邀请与回执，`readOverview()` 返回统计。页面不保存
列表排序到服务端。公开消费者入口（Email、发送按钮、Team note、Invitations 列表、行 id、
Refresh overview 和 overview test id）保持不变。

目标是让一次提交至多发出一次 POST，成功后立即在列表和状态中显示接受的邀请；统计刷新是
独立的后续读取，失败不能撤销已接受的邀请或误报发送失败。移动仅修改本页数组顺序；重绘后
焦点仍回到同一语义控件，且发送完成不会打断用户在 Email 或 Team note 的后续输入。

## 实施序列（3 步）

1. **建立页面状态与渲染契约**（`src/app.mjs`）：保留邀请、统计和草稿为独立状态；增加发送、
   统计错误和请求代号的归属状态。`draw()` 在替换 DOM 前记录可聚焦控件，并按 email、note 或
   `邀请 id + 移动方向` 恢复它。检查：键盘连续移动后焦点仍在同一邀请的同一操作。
2. **实现发送和统计的独立异步操作**（`src/app.mjs`）：提交时以 `sending` 防重，捕获提交邮箱及
   草稿版本；发送成功即追加返回邀请并发布回执状态，仅当草稿版本未变化时清空 Email。随后触发
   最新结果策略的统计读取。发送失败保留草稿并显示发送错误。检查：一次点击仅 POST 一次；统计
   失败后仍显示新邀请和成功状态。
3. **实现本地排序与交互状态**（`src/app.mjs`、`src/style.css`）：移动按钮只交换相邻条目，不调用
   transport；边界操作禁用；样式保证窄宽内容均可阅读。检查：列表顺序变化但没有 POST，且 note
   在刷新/重绘后保持。

## 代码契约与所有权

- `submitInvitation(event)` 归页面所有：以当前草稿快照调用 `sendInvitation`，成功后拥有对 `rows`
  和发送状态的更新；失败只拥有发送错误。`sending` 是防止重复命令的本地策略。
- `refreshOverview()` 归页面所有：每次读取获得递增的请求代号，只有最新完成的读取可以发布
  `overview` 或统计错误，避免旧响应覆盖新读取。
- `moveInvitation(id, direction)` 归页面所有：只对 `rows` 作相邻交换。列表行通过 `data-invite-id`
  和 `data-move` 形成可恢复的焦点标识，不涉及 transport。
- `emailRevision` 区分“提交时的草稿”与用户在等待期间的新编辑；成功不会错误清除新输入。Team note
  是独立草稿，不由发送、统计或排序流程写入。

## 技术架构

```text
[DOM form/list/note]
        | events
        v
[src/app.mjs page owner] ---- sendInvitation(email) ----> [POST /api/invitations]
        |                         ^                                |
        |                         | invitation + receipt           v
        |                         +-------------------------- [transport.mjs]
        |
        +---- readOverview() --------------------------------> [GET /api/overview]
        |                         ^                                |
        +---- rows / drafts / feedback <---------------------------+
        |
        +---- local adjacent swap (no transport)
```

## 数据流

```text
Email draft + revision
  -> submitInvitation snapshot
  -> POST /api/invitations
  -> success: append invitation -> status("Invitation sent…") -> render/focus restore
                    -> refreshOverview(request id) -> latest success: overview -> render
                                                  \-> latest failure: overview error -> render
  -> failure: send error + unchanged email draft -> render/focus restore

Move button -> moveInvitation(id, direction) -> rows adjacent swap -> render -> same id/action focus
Team note input -> note draft (no request) -> survives every render
```

## 验证与演进

`npm run check` 覆盖发送成功、统计刷新、列表本地移动及 note 保留；补充浏览器测试以覆盖统计失败
不撤销已接受邀请和焦点保持。后续若服务端增加持久化排序，应新增明确的排序
transport 命令，而不改变现有 `moveInvitation` 的本地显示契约。

已执行：2026-10-19 运行 `npm run check`，5 个 Chromium 用例通过；其中新增用例确认统计读取
失败不会撤销已接受邀请，且移动后焦点保持在同一邀请的同一方向按钮。重复提交由 `sending`
在实际发送命令入口防护；现有发送成功用例确认一次提交后的列表和统计结果。
