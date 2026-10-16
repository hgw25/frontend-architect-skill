已完成可发布的 headless Dialog primitive。

主要交付：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/src/Dialog.tsx)：组合式 API、受控/非受控状态、portal、ARIA、焦点循环与恢复、Escape、外部点击及事件取消。
- [dialog-layer.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/src/dialog-layer.ts)：嵌套层栈、顶层判定、背景 `inert`/`aria-hidden` 管理。
- [index.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/src/index.ts)：公开包入口。
- [App.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/src/App.tsx)：保留原示例行为，并覆盖嵌套及受控模式；业务文案和按钮均留在产品层。
- [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/README.md)：实现边界、完整 API、测试矩阵和三产品渐进迁移方案。
- 包构建提供 ESM、声明文件、React 18/19 peer 依赖、根导出与 `"use client"` 边界。

已通过：

- `npm run typecheck`
- SSR 测试，2 项通过
- 应用生产构建
- 包构建、NodeNext 消费者类型检查及 ESM 导出检查
- `npm pack --dry-run`
- `git diff --check`

浏览器验收未能在当前沙箱执行：Vite 监听端口被 `EPERM` 拒绝，直接启动 Chromium 也被 macOS Mach 权限拦截，Firefox 同样在启动阶段终止。四项 Playwright 测试和只读宿主脚本均保留且未弱化；在允许启动浏览器和监听本地端口的环境运行 `npm run test:browser` 与 `node scripts/check-dialog-contract.mjs` 即可完成最终浏览器验收。