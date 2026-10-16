已完成可发布的 headless Dialog primitive，并保留原示例行为。

核心交付：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控与非受控状态、嵌套 Dialog、Portal、自定义容器和消费者样式
- 完整焦点环、焦点恢复、背景 `inert`、滚动锁定及顶层 Escape 所有权
- SSR 安全，并通过真实 Chromium 验证 `defaultOpen` 水合无 mismatch
- ESM 包导出、类型声明、React peer dependencies 和 NodeNext 消费者检查
- 产品文案、业务按钮与 CSS 均留在消费层

主要文件：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-wofqqr31/src/Dialog.tsx)
- [modalStack.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-wofqqr31/src/dialog/modalStack.ts)
- [focus.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-wofqqr31/src/dialog/focus.ts)
- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-wofqqr31/README.md) — 公开 API、实现边界、测试矩阵和三产品渐进迁移方案
- [package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-wofqqr31/package.json)

验证结果：

- `npm run check`：通过
- TypeScript：通过
- SSR：2/2 通过
- 真实 Chromium：3/3 通过
- demo、ESM package、声明文件构建：通过
- NodeNext 包入口消费测试：通过
- `npm pack --dry-run`：通过，最终包 5 个文件、约 6.3 kB

本地 `.frontend-architect` 指导文件保持未修改。