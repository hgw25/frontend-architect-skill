已完成可发布的 headless Dialog primitive。

主要交付：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qfg_3_9x/src/Dialog.tsx)：提供 `Root / Trigger / Portal / Overlay / Content / Title / Description / Close` API，支持受控与非受控状态、ref、原生属性及自定义样式。
- [dialog-layer.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qfg_3_9x/src/dialog-layer.ts)：集中管理焦点循环、初始/恢复焦点、顶层 Escape、外部点击、嵌套层级及背景 `inert`/`aria-hidden` 恢复。
- Portal 延迟到浏览器 effect 创建，兼容 SSR 与首轮水合；ARIA ID 使用 `useId`。
- 示例保留原有文案、字段、嵌套弹窗和关闭行为；父级实际使用受控模式，子级使用非受控模式。
- [package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qfg_3_9x/package.json) 和 [src/index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qfg_3_9x/src/index.ts) 已配置 ESM、类型声明、peer dependencies 和受限公开导出。
- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-qfg_3_9x/README.md) 包含核心边界、完整 API、测试矩阵和三产品渐进迁移/回滚方案。
- Playwright 测试增加了 ARIA、portal、背景隔离、嵌套层恢复和外部点击断言，没有删除或放宽原测试。

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：2/2 通过
- `npm run build`：应用和库构建通过；库 ESM 约 8.4 kB，gzip 2.89 kB
- `npm run test:package`：通过
- `npm pack --dry-run --cache /tmp/headless-dialog-npm-cache`：通过，发布包内容正确
- `git diff --check`：通过
- `npm run test:browser`：未进入任何测试。当前 macOS 沙箱在浏览器进程启动阶段拒绝 Mach IPC，Chromium 报 `bootstrap_check_in ... Permission denied (1100)`；Firefox 和 WebKit 也在启动阶段被系统终止。因此真实浏览器断言已准备并实际发起，但本环境无法给出通过结论。