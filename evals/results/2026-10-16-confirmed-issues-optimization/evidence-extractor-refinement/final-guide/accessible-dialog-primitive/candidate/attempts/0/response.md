实现已完成；类型、SSR、构建及发布产物检查通过，但当前沙箱禁止启动浏览器和监听本地端口，因此不能宣称真实浏览器验收已通过。

主要交付：

- 可组合 headless API，支持受控/非受控、Portal、嵌套 Dialog、ARIA、事件取消、ref 与自定义样式：[Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/src/Dialog.tsx:76)
- 独立焦点栈、Tab 闭环、顶层 Escape、背景 inert、滚动锁定及焦点恢复：[focus-management.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/src/dialog/focus-management.ts:143)
- 示例文案、业务按钮和样式仍留在产品层，原有可观察行为保留：[App.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/src/App.tsx)
- ESM 包出口、声明文件、React peer dependencies 和发布构建：[package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/package.json:9)
- 公开 API、实现边界、测试矩阵和三个产品的增量迁移方案：[README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/README.md:5)
- 新增受控、ARIA/背景隔离及 hydration 浏览器用例，同时保留原焦点和嵌套断言：[dialog.contract.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/tests/dialog.contract.spec.ts:5)

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：3 项通过
- `npm run build:app`：通过
- `npm run test:package`：通过
- `npm pack --dry-run`：通过，产物共 9 个文件
- Playwright：5 项测试成功发现并编译
- Chromium、WebKit、Firefox 实际启动均被沙箱终止；宿主脚本监听 `127.0.0.1:5173` 时返回 `EPERM`

在允许浏览器进程与本地端口的环境运行 `npm run check`，即可完成剩余真实浏览器验收。