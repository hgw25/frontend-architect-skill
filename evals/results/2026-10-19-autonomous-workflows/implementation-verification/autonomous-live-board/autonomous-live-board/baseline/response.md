已完成看板卡片排序：

- 按钮与拖拽统一更新同一顺序状态，保留卡片 DOM 身份与按钮焦点。
- 使用可中断 FLIP 动画，连续操作不会跳回旧位置。
- 保存请求串行合并，确保最终保存最新顺序；失败提供可见提示和重试。
- 隐藏、滚动、窗口调整会清理动画；支持减少动态效果偏好。
- 增加拖拽、焦点和错误状态样式。

修改文件：

- [src/app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-qf74rxls/src/app.mjs:1)
- [src/style.css](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-live-board-baseline-qf74rxls/src/style.css:1)

验证结果：

- `node --check` 通过
- `git diff --check` 通过
- `npm run check` 无法在当前沙箱启动：环境禁止监听本地端口（`listen EPERM 127.0.0.1`），直接启动 Chromium 也被系统进程权限阻止。评测脚手架文件均未修改。