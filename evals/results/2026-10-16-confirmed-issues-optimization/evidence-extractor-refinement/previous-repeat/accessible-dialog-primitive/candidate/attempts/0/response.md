已完成可发布的 headless Dialog primitive。

主要交付：

- [核心实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/Dialog.tsx:20)：组合式 API、受控/非受控状态、portal、SSR 安全挂载、焦点进入与恢复、Escape/外部点击、嵌套 Dialog。
- 使用原生模态 `<dialog>` 管理 top-layer、背景 inert、焦点约束和嵌套 Escape 顺序。
- [公开入口](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/index.ts:1) 和 [package exports](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/package.json:1)，包含 ESM、类型声明、peer dependencies 和发布构建。
- [示例迁移](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/src/App.tsx:1) 保留原文案、嵌套流程和关闭行为；业务内容仍在产品层。
- [设计边界、API、测试矩阵和三产品迁移方案](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/README.md:1)。
- [Playwright 契约测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-8kncmt7x/tests/dialog.spec.ts:39) 新增 ARIA/portal 和受控模式覆盖；原焦点、Escape、嵌套测试未削弱。
- `.frontend-architect` 和只读 host harness 未修改。

验证结果：

- `npm run typecheck`：通过
- SSR：2/2 通过
- package 与 demo production build：通过
- public runtime exports 检查：通过
- `npm pack --dry-run`：通过，6 个发布文件，约 10.8 kB
- `git diff --check`：通过
- 真实浏览器检查已实际启动，但沙箱禁止 Chromium 注册 macOS Mach service；4 条用例均在浏览器启动前中止，没有进入断言。
- 独立 host contract 同样因沙箱禁止监听 `127.0.0.1` 而得到 `EPERM`。需在允许启动浏览器和本地端口的 CI 中补跑 `npm run test:browser` 与 `node scripts/check-dialog-contract.mjs`。