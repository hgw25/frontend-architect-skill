已完成表单与表格交互修复。

- 清空按钮隐藏时不再占据输入宽度；键盘可正常聚焦并清空，随后焦点返回输入框，可继续输入。
- 保存使用稳定快照；失败后保留草稿并可重试，在途编辑不会被完成回调清除，即使内容改回原值也能正确识别。
- 表格仅在布局 ready 后测量并动画实际可见行，覆盖不同视口和延迟内容；减少动态效果时不启动动画。
- 动画与保存流程相互独立，不会延迟业务提交。
- 为按钮补充了明确的 `type="button"`。

修改文件：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-z7_gsdvh/src/app.mjs)
- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-z7_gsdvh/src/style.css)
- [index.html](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-z7_gsdvh/index.html)

验证结果：

- 真实 Chromium 等价旅程全部通过：清空与焦点、失败重试、提交竞态、600/920px 视口、延迟入场、reduced-motion、提交不等待动画。
- `node --check src/app.mjs` 通过。
- `git diff --check` 通过。
- 原始 `npm run check` 已执行，但评测启动器监听 `127.0.0.1` 时被沙箱以 `EPERM` 拒绝，因此未能原样跑完；改用 Playwright 请求拦截加载同一份产品文件并完成上述真实浏览器验证。