已完成统一表单与表格交互，仅修改应用源码：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-dbnbjzyk/src/app.mjs:8)
  - 清空后恢复输入框焦点，并记录程序化清空的编辑版本。
  - 保存使用提交瞬间的不可变快照。
  - 失败保留草稿并允许重试。
  - 在途编辑不会被成功回调清空；提交内容也不会随当前输入漂移。
  - 表格 ready 后等待布局生效，再动画容器与视口内实际可见的行。
  - 减少动态效果时完全跳过行动画，动画不阻塞保存流程。

- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-dbnbjzyk/src/style.css:6)
  - 清空按钮隐藏时宽度、边框和内边距均释放给输入文字。
  - 键盘聚焦按钮时重新显示，保持可操作性。

验证结果：

- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- `npm ci`：通过，锁文件未改变。
- `npm run check`：已运行，但沙箱禁止监听 `127.0.0.1`，以 `listen EPERM` 终止，Playwright 用例未开始执行。
- 单独启动 Chromium 也被 macOS Mach bootstrap 权限拒绝，因此真实浏览器中的焦点、尺寸、竞态和动画断言在当前环境内仍未完成验证。

未修改 `.frontend-architect`、测试文件或其他 evaluation harness 文件。