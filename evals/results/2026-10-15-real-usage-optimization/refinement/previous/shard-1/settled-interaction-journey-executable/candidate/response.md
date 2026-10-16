已完成表单和表格交互：

- 清空按钮隐藏时不再占宽；键盘触发清空后焦点返回输入框，可直接继续输入。
- 保存使用提交快照与编辑版本：失败可重试原提交；请求期间的新编辑不会被清空；成功内容不会漂移为当前草稿。
- 表格在 `ready` 后下一帧测量容器与视口交集，只动画实际可见行；减少动态效果时完全跳过。
- 表格延迟与保存流程彼此独立，动画不会阻塞提交。
- 按钮补充了明确的 `type="button"`。

改动位于：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-yramz_rf/src/app.mjs:8)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-yramz_rf/src/style.css:6)
- [index.html](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-yramz_rf/index.html:4)

验证结果：

- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- `.frontend-architect` 和指定 harness 文件均未修改。
- 真实浏览器检查未能实际进入页面：沙箱先拒绝测试服务器监听（`listen EPERM 127.0.0.1`），绕过服务器后又拒绝 Chromium 的 Mach 端口注册。因此现有 Playwright journey 在本环境中仍属未验证范围；已准确保留该限制，未声称浏览器测试通过。