已完成表单与表格交互修复：

- 清空按钮隐藏时不再占宽；键盘清空后焦点返回输入框，可立即继续输入。
- 保存使用点击时的值快照；失败保留草稿并可重试。
- 保存过程中产生的新编辑不会被完成回调清除；表格只写入实际提交的快照。
- 表格布局 ready 后才测量，并仅动画容器和视口内实际可见的行。
- 支持延迟 ready、不同视口和 `prefers-reduced-motion`；动画不阻塞保存请求。
- 未修改 `.frontend-architect` 或评测 harness。

修改文件：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-9tqtm14q/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-9tqtm14q/src/style.css)

验证：

- `node --check src/app.mjs`：通过
- `git diff --check`：通过
- Playwright 真实浏览器检查未能实际进入用例：依赖安装被网络沙箱拒绝；复用本机 Playwright 后，本地服务监听被 `EPERM` 禁止，直接启动 Chromium 也被宿主 Mach port 权限阻止。因此现有 5 个浏览器用例仍属于未验证范围。