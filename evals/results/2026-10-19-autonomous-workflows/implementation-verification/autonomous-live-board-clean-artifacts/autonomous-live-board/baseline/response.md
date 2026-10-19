已完成看板卡片排序：

- 支持 Move up / Move down 与拖拽手柄排序。
- 保留卡片 DOM 身份和按钮焦点。
- 使用可中断、可重定向的 FLIP 动画，连续操作不会跳回旧位置。
- 串行保存最新顺序，旧响应不会覆盖新操作。
- 保存失败显示错误并提供 Retry save。
- 隐藏、恢复、窗口缩放会清理动画和拖拽状态。
- 支持 `prefers-reduced-motion`。

修改文件：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-t0kmwnyj/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-t0kmwnyj/src/style.css)

验证：

- `node --check`：通过
- `git diff --check`：通过
- `npm run check`：沙箱禁止绑定 `127.0.0.1`，随后 Chromium 也因 Mach 端口权限被阻止，因此浏览器测试未能在当前环境启动。只读测试及配置文件均未修改。