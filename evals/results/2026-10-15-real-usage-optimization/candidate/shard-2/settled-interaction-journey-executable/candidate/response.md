已完成统一表单与表格交互：

- 清空按钮隐藏时不再占宽；键盘清空后焦点返回输入框，可继续输入。[style.css](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-b19oskqj/src/style.css:4)
- 保存入口捕获固定快照；失败后可重试，在途编辑不会被清空，成功提交内容不会随草稿漂移。[app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-b19oskqj/src/app.mjs:7)
- 表格在布局就绪后的下一帧，根据容器和视口几何只动画实际可见行；支持延迟就绪和 `prefers-reduced-motion`，且动画不参与保存执行链。[app.mjs](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-b19oskqj/src/app.mjs:32)
- 补充按钮 `type="button"`，避免未来纳入表单时意外提交。[index.html](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-b19oskqj/index.html:4)

验证结果：

- `npm ci`：成功
- `node --check src/app.mjs`：通过
- `git diff --check`：通过
- `npm run check`：已执行，但沙箱禁止监听 `127.0.0.1`，在 Playwright 配置初始化阶段报 `EPERM`
- 直接启动 Chromium 也因沙箱禁止 macOS Mach port 注册而失败

因此，现有真实浏览器用例未实际进入执行；键盘焦点、真实布局测量、网络重试和动画表现仍需在允许启动 Chromium及本地监听端口的环境中复跑。评测脚手架和 `.frontend-architect` 均未修改。