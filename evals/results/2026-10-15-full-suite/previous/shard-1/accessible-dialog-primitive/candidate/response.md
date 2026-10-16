已完成可发布的 headless Dialog primitive，并保留原示例的文案与交互。

主要交付：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`
- 支持受控、非受控、嵌套 Dialog、Portal、自定义样式与 ref
- 完整焦点圈定、初始焦点、焦点恢复、顶层 Escape、背景 `inert`/`aria-hidden`、滚动锁定
- SSR 安全，并提供 default-open 水合 fixture
- ESM、类型声明和 package exports
- 示例已迁移：父层受控、子层非受控
- API、实现边界、测试矩阵及三产品渐进迁移方案见 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-ppuobwn7/README.md)
- 核心实现位于 [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-ppuobwn7/src/Dialog.tsx)，document 级层级与焦点策略拆分在 [dialog-layer.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-ppuobwn7/src/dialog-layer.ts)

验证结果：

- SSR/水合静态契约：3/3 通过
- 严格 TypeScript 源码检查：通过
- package ESM 与 `.d.ts` 构建：通过
- package 自引用导入：通过
- `npm pack --dry-run`：通过，发布内容正确
- DOM 交互 smoke test：通过

真实 Playwright 浏览器套件已扩充，但当前沙箱阻止 npm 下载 Playwright（`EPERM`），本机 Chrome 也被沙箱以退出码 134 阻止启动，因此 `npm run test:browser` 未能在此环境完成。测试没有删除或弱化；正常依赖和浏览器环境中可直接运行。