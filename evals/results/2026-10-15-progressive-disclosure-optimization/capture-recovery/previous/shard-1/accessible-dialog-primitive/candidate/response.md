已完成可发布的 headless Dialog primitive，并保留原示例的打开、聚焦、嵌套、关闭和焦点恢复行为。

核心交付：

- 可组合 API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控、非受控、portal、自定义容器、ref 和消费者样式
- 自动 ARIA 关联、初始聚焦、Tab 环绕、焦点逃逸拦截和焦点恢复
- 私有 document 级 Dialog 栈，确保嵌套时仅顶层响应 Escape
- SSR 不访问浏览器全局；portal 在 hydration 后挂载
- ESM、类型声明、peer dependencies、package exports 和打包 smoke test
- 完整 API、实现边界、测试矩阵与三产品渐进迁移方案

关键文件：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-i88_jx0x/src/Dialog.tsx:49)
- [focus-stack.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-i88_jx0x/src/dialog/focus-stack.ts:44)
- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-i88_jx0x/README.md:5)
- [dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-i88_jx0x/tests/dialog.spec.ts:27)
- [package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-i88_jx0x/package.json:11)

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：2/2 通过
- 浏览器测试 bundle 构建：通过
- `npm run build`：通过，ESM 包约 6.2 kB
- `npm run test:package`：通过，实际 exports 可加载
- `git diff --check`：通过
- Playwright 真实浏览器：已尝试 headless shell、Chrome for Testing 和系统 Chrome，但当前 macOS 沙箱在浏览器启动阶段拒绝 Mach port 注册（`Permission denied`）；页面代码和 5 个断言均未开始执行。测试未删除或弱化，可在允许启动 Chromium 的环境直接运行 `npm run test:browser`。