已完成可发布的 headless Dialog primitive，并将示例迁移到新 API，保留原有文案、按钮与交互表现。

主要交付：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控、非受控、Portal、自定义容器、嵌套 Dialog、SSR/水合、ref 与消费者样式
- 统一初始聚焦、Tab 圈定、Escape、遮罩关闭和焦点恢复
- 嵌套时仅顶层响应关闭，父 Dialog 自动进入 `inert`
- 业务文案、按钮和 CSS 均留在产品层
- 增加 ESM 构建、类型声明、peer dependencies、exports 和 `prepack`
- 完整 API、实现边界、测试矩阵及渐进迁移方案见 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/README.md)

核心实现位于：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/src/Dialog.tsx)
- [focus.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/src/dialog/focus.ts)
- [layers.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/src/dialog/layers.ts)
- [package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/package.json)

验证结果：

- TypeScript：通过
- SSR 测试：2/2 通过
- Demo 生产构建：通过
- 独立包构建及声明生成：通过
- 公共包入口导入：通过
- `npm pack --dry-run`：通过，发布物 7 个文件、约 6.8 kB
- `git diff --check`：通过

真实浏览器测试已分别尝试标准 Playwright、无服务器 Chromium、Firefox 和 WebKit；当前沙箱禁止本地端口监听并阻止浏览器进程的 macOS IPC 注册，均在页面加载前被系统终止。因此浏览器断言已补全但无法在此权限环境实际跑完。只读的 `scripts/check-dialog-contract.mjs` 保持未修改。