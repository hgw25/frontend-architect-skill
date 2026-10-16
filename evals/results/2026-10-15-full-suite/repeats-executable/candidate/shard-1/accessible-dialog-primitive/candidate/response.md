已完成 headless Dialog primitive，并保留原有示例的文案、按钮与交互表现。

主要交付：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控、非受控、Portal、自定义容器、嵌套 Dialog、SSR/水合及 `initialFocusRef`
- 统一焦点陷阱、焦点恢复、顶层 Escape、背景 `inert/aria-hidden`
- 所有样式由消费者通过原生 props、`className`、`style` 控制，包不发布 CSS
- ESM 包导出、React peer dependencies、类型声明和 NodeNext 消费测试
- 三产品渐进迁移、回滚策略、API 与测试矩阵已写入 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-4iyolqd9/README.md:9)

关键实现：

- React 公共契约：[src/Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-4iyolqd9/src/Dialog.tsx:64)
- 私有焦点与嵌套层管理：[modalManager.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-4iyolqd9/src/dialog/modalManager.ts:77)
- 包入口：[src/index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-4iyolqd9/src/index.ts)
- Playwright 行为矩阵：[dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-4iyolqd9/tests/dialog.spec.ts:18)

验证结果：

- `npm run typecheck`：通过
- SSR：2/2 通过
- 示例生产构建：通过
- 库 ESM、声明文件、NodeNext 消费、runtime exports、`npm pack --dry-run`：通过
- `git diff --check`：通过
- `.frontend-architect`：未修改
- Playwright 的 5 个真实浏览器用例及夹具均成功构建，但当前宿主禁止浏览器进程注册 macOS Mach 服务；Chromium、Firefox、WebKit 都在创建页面前被系统终止。因此 `npm run check` 停在浏览器启动阶段，没有把这些用例误报为通过。