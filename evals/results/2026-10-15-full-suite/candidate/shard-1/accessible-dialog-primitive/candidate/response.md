已完成可发布的 headless Dialog primitive，并保留原有示例行为。

主要交付：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控、非受控、嵌套 Dialog、自定义 portal 容器及消费者样式
- 完整焦点进入、Tab 循环、防焦点逃逸、关闭后恢复
- 仅顶层 Dialog 响应 Escape 和背景点击
- 背景 `inert`、`aria-hidden`、稳定 ARIA 关联及 modal 语义
- SSR 安全，portal 延迟到浏览器挂载；新增静态水合 fixture
- ESM、类型声明、React peer dependency 和根入口导出
- 产品文案、业务按钮及 CSS 均保留在消费者层

核心实现位于 [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-2xo8n10g/src/Dialog.tsx)，焦点与层级分别由 [dialog-focus.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-2xo8n10g/src/dialog-focus.ts) 和 [dialog-layer.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-2xo8n10g/src/dialog-layer.ts) 私有维护。

公开 API、包边界、测试矩阵和三产品渐进迁移方案已记录在 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-2xo8n10g/README.md)。浏览器行为覆盖见 [dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-2xo8n10g/tests/dialog.spec.ts)。

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：3/3 通过
- `npm run build`：应用和库产物均构建成功
- `npm pack --dry-run`：发布内容和类型声明正确
- 构建后公共入口导入及 SSR：通过
- `git diff --check`：通过

真实浏览器检查已尝试，但当前 macOS 沙箱在用例执行前拒绝预览服务器端口，并禁止 Chromium 注册 Mach port；Firefox 也在启动时被宿主终止。因此 Playwright 断言未实际运行。项目保留了标准 preview + Chromium 配置，可在正常 CI/本机直接执行 `npm run test:browser`。指定的 `.frontend-architect` 内容未作修改。