实现已完成；除真实浏览器运行被当前 macOS 沙箱阻止外，其余检查均通过。

- 新增 headless 组合 API：`Root/Trigger/Portal/Overlay/Content/Title/Description/Close`，支持受控、非受控、嵌套、ref、原生属性和自定义样式。[Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-en067y9y/src/Dialog.tsx)
- 集中管理焦点圈定、恢复、顶层 Escape、背景 `inert/aria-hidden` 与滚动锁定。[dialogLayers.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-en067y9y/src/dialogLayers.ts)
- Portal 延迟到客户端挂载，避免 SSR 访问 DOM 和水合差异。
- 示例父 Dialog 使用受控模式，嵌套 Dialog 使用非受控模式；原有文案、按钮和可观察交互保持不变。
- 增加 ESM 构建、类型声明、package exports、React peer dependencies 和外部消费者类型检查。
- API、实现边界、测试矩阵及三产品渐进迁移方案记录在 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-en067y9y/README.md)。

已通过：

- `npm run typecheck`
- `npm run test:ssr`
- `npm run build`
- `npm run build:package`
- `npm run check:package`
- `npm pack --dry-run --json`

浏览器验收未能实际执行：沙箱禁止 Vite 监听本地端口，并禁止 Chromium/WebKit/Firefox 启动所需的系统进程通信。Playwright 行为测试已扩充且未弱化；需在允许启动浏览器和监听 localhost 的环境运行 `npm run test:browser` 及 `node scripts/check-dialog-contract.mjs`。