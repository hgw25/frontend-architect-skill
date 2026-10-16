已完成统一表单与表格交互：

- [src/app.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-0io111o9/src/app.mjs:6)
  - 提交值与可编辑草稿分离，失败后可重试。
  - 通过编辑版本防止在途修改被成功回调清空，包括 `A → B → A`。
  - 表格始终写入提交时快照，避免内容漂移。
  - 清空后恢复输入框焦点，可直接继续键入。
  - 布局 ready 后再测量容器与视口交集，仅动画实际可见行。
  - 支持延迟、不同视口和 `prefers-reduced-motion`；动画不阻塞保存请求。

- [src/style.css](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-settled-interaction-journey-executable-candidate-0io111o9/src/style.css:4)
  - 清空按钮隐藏时不再占宽。
  - hover 或键盘进入字段时显示，保持键盘可达。

按本地技能的生命周期指导，草稿、提交快照和异步完成态现在有明确归属。

验证：

- `npm ci`：通过。
- `node --check src/app.mjs`：通过。
- `git diff --check`：通过。
- `npm run check`：已执行，但环境禁止监听 `127.0.0.1`，报 `listen EPERM`。
- 进一步直接启动 Chromium/Firefox 也被宿主沙箱阻止，因此真实浏览器断言未能在当前环境完成。

只修改了两个源码文件；指定的 harness 与 `.frontend-architect` 均未改动。