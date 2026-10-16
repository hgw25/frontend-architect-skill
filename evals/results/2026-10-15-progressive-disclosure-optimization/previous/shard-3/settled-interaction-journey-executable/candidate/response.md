已完成表单与表格交互修复：

- 清空按钮隐藏时退出布局，输入框获得完整宽度；键盘触发清空后焦点回到输入框，可立即继续输入。[style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-26cwa902/src/style.css:4)
- 保存使用稳定提交快照；失败保留草稿并允许重试；请求期间的新编辑不会被完成回调清除，表格只提交该次快照。[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-26cwa902/src/app.mjs:8)
- 表格在 `data-ready=true` 后等待布局帧，再根据容器与视口的真实交集仅动画可见行；延迟可配置，减少动态效果时完全跳过动画，动画不参与保存流程。[app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-26cwa902/src/app.mjs:54)
- 按钮补充了明确的 `type="button"`。[index.html](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-26cwa902/index.html:4)

验证结果：

- `npm ci`：成功
- `node --check src/app.mjs`：通过
- `git diff --check`：通过
- Playwright 成功发现全部 6 个现有浏览器测试
- `npm run check` 已实际执行，但沙箱禁止监听 `127.0.0.1`，报 `listen EPERM`；直接启动 Chromium 也因 Mach 端口权限被拒。因此浏览器断言未进入执行阶段，这是当前未验证范围，而非测试断言失败。

`.frontend-architect` 目录及只读测试工具文件均未修改。