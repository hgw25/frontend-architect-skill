已完成统一表单与表格交互：

- [app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-kn6a53jf/src/app.mjs:8)
  - 键盘清空后恢复输入框焦点。
  - 保存时固定提交快照；失败保留草稿并允许重试。
  - 在途编辑不会被响应清空，表格提交内容也不会随草稿漂移。
  - 布局就绪后的下一帧测量实际可见行，仅为可见范围创建动画。
  - 遵循 `prefers-reduced-motion`，动画不参与保存流程。

- [style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-kn6a53jf/src/style.css:6)
  - 清空按钮隐藏时宽度、内边距和边框均释放，输入框使用完整空间。
  - 悬停或键盘聚焦时恢复按钮尺寸与交互。

- [index.html](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-kn6a53jf/index.html:4)
  - 明确清空按钮为非提交按钮。

验证结果：

- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- `npm run check`：已执行，但沙箱禁止监听 `127.0.0.1`，在测试服务器启动阶段报 `EPERM`，断言未开始执行。
- 额外尝试 Chromium、WebKit、Firefox 均被当前 macOS 沙箱阻止启动。因此真实浏览器中的焦点、布局宽度和动画行为仍需在允许启动浏览器及本地服务的环境中复跑。