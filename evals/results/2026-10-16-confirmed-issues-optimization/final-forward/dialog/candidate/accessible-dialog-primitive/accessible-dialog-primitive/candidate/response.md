修复已完成；浏览器验收仍需宿主环境复跑。

根因是 initially-open Dialog 正确地将背景 trigger 设为 `inert`/`aria-hidden`，但测试加载器却通过 accessible-role 查询等待该 trigger，最终超时。

修复内容：

- hydration 页面改为等待可访问的 Dialog 就绪，不再等待已被隔离的 trigger：[load-built-app.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/tests/load-built-app.ts:19)
- 仍通过 DOM 断言检查 SSR trigger 标记，未弱化焦点、ARIA 或 hydration 契约：[dialog.contract.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/tests/dialog.contract.spec.ts:41)
- 将伪 SSR 修正为构建阶段生成服务器标记，浏览器仅执行 `hydrateRoot`：[vite.config.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/vite.config.ts:21)、[hydration-main.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/src/hydration-main.tsx:12)
- 服务端和客户端共用同一个 Fixture，避免标记漂移：[HydrationFixture.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-xd9dm1rk/src/HydrationFixture.tsx:12)
- hydration 客户端入口由约 166 KB 降至 0.65 KB，不再打包 `react-dom/server`。
- 受保护的 `scripts/check-dialog-contract.mjs` 未修改。

当前验证：

- `npm run typecheck`：通过
- `npm run test:ssr`：3 项通过
- `npm run build:app`：通过，产物包含 SSR trigger 标记
- `npm run test:package`：通过
- `npx playwright test --list`：发现全部 5 项测试
- `git diff --check`：通过
- `npm run test:browser`：Chromium 在执行测试前因沙箱 Mach port 权限被终止
- `npm run test:host`：当前沙箱禁止监听 `127.0.0.1:5173`；宿主反馈中的同一受保护检查此前已通过

因此，本轮失败的错误就绪条件与不正确 SSR fixture 已修复，但不能在当前受限环境中宣称真实浏览器套件已经通过。