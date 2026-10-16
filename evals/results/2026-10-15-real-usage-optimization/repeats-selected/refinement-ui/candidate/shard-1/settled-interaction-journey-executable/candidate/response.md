已完成统一交互修复，仅修改应用源码：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-ll3wgxow/src/app.mjs:6)
  - 保存时固定提交快照，避免在途编辑改变请求或表格内容。
  - 用草稿修订号识别期间编辑，包括改回原值和清空操作。
  - 失败后保留草稿并允许重试；成功仅在草稿未变化时清空。
  - 表格布局就绪后再测量并动画实际可见行。
  - reduced motion 下完全跳过行动画。

- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-ll3wgxow/src/style.css:6)
  - 隐藏清空按钮时释放全部宽度。
  - 鼠标悬停或字段内聚焦时恢复按钮。
  - 键盘清空后焦点返回输入框，可立即继续输入。

验证结果：

- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- Playwright 成功发现全部 6 个既有场景。
- `npm run check` 已执行，但沙箱禁止监听 `127.0.0.1`，报 `listen EPERM`。
- 额外尝试无服务器启动 Chromium，同样被沙箱禁止 Mach 服务注册。因此真实浏览器断言在本环境中未能实际完成，属于明确的未验证范围。
- 只读 harness 与 `.frontend-architect` 内容均未修改。