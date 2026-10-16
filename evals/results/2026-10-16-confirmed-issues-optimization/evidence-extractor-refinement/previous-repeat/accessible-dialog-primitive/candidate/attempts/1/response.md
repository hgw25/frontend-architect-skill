已修复宿主发现的 Shift+Tab 焦点环绕缺陷。

根因是原生 `<dialog>` 虽然限制焦点留在模态层，但 Chromium 不保证从第一个控件反向 Tab 时直接环绕到最后一个控件。

修复内容：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/Dialog.tsx:160) 增加可见、可用元素的实际 Tab 顺序计算。
- [焦点边界处理](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/Dialog.tsx:227) 显式处理首尾 Tab/Shift+Tab 环绕及无可聚焦内容场景。
- [消费者事件组合](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/Dialog.tsx:374) 先执行消费者 `onKeyDown`；调用 `preventDefault()` 仍可接管默认策略。
- [README](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/README.md:5) 已同步实现边界和公开事件契约。
- 未修改或弱化既有 Playwright 用例及 `scripts/check-dialog-contract.mjs`。

验证结果：

- `npm run typecheck`：通过
- SSR：2/2 通过
- package 与 demo production build：通过
- `npm pack --dry-run`：通过，6 个发布文件
- `git diff --check`：通过
- `npm run check`：类型、SSR、demo build 通过；Playwright 在启动 Chromium 时被当前沙箱拒绝注册 Mach service，四条用例均未加载页面，因此命令退出 1。
- 独立 host contract 在当前沙箱监听 `127.0.0.1` 时得到 `EPERM`，需由具备浏览器和本地端口权限的宿主环境完成最终行为复验。