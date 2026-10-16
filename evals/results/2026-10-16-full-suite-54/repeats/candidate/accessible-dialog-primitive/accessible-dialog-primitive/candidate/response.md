已完成可发布的 headless Dialog primitive，并保持示例原有文案、按钮和交互结构。

- Compound API 支持受控/非受控状态、portal、自定义容器、ref、样式 hooks 和可取消的 Escape/外部点击：[Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-pr_vw0gg/src/Dialog.tsx:24)
- 独立模态栈负责首焦点、双向焦点环、嵌套 Escape、焦点恢复、背景 `inert`/`aria-hidden`、滚动锁及动态 DOM：[dialogManager.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-pr_vw0gg/src/dialogManager.ts:69)
- SSR portal 延迟到水合后挂载；示例通过真实 SSR 预渲染产物执行水合。
- 公开 ESM、声明文件、peer dependencies 和包根 exports：[package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-pr_vw0gg/package.json:10)
- API、实现边界、测试矩阵及三个产品的渐进迁移/回滚方案已记录：[README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-pr_vw0gg/README.md:5)
- Playwright 覆盖水合、ARIA、portal、背景隔离、正反向 Tab、嵌套 Escape、焦点恢复及遮罩关闭：[dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-pr_vw0gg/tests/dialog.spec.ts:30)

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：2/2 通过
- `npm run build`：通过
- `npm run test:package`：通过，包括 NodeNext 消费者类型检查、公开导出检查及 `npm pack --dry-run`
- `git diff --check`：通过
- Playwright 共识别 4 个行为测试

真实浏览器检查已分别尝试 Chromium、Firefox 和 WebKit，但三个浏览器都在创建页面前被当前 macOS 沙箱终止；Chromium 明确报 Mach IPC `Permission denied`，Firefox/WebKit 进程级 abort。因此不能声称浏览器断言已通过。测试承载已改为无需本地端口的“SSR 预构建产物 + Playwright 路由”，在允许启动浏览器的环境运行 `npm run test:browser` 即可完成剩余验证。