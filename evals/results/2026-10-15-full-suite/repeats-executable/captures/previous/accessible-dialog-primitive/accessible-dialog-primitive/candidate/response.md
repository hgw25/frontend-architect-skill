已完成可发布的 headless Dialog primitive，并保留原示例的文案、嵌套流程和关闭行为。

- Compound API：`Root/Trigger/Portal/Overlay/Content/Title/Description/Close`，支持受控、非受控、ref、原生属性及自定义样式。[Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-n9qz4afd/src/Dialog.tsx:85)
- 独立焦点层管理器统一处理 Tab 循环、焦点逃逸、顶层 Escape、嵌套恢复、背景 `inert`/`aria-hidden` 和滚动锁。[focus-management.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-n9qz4afd/src/dialog/focus-management.ts:115)
- Portal 延迟到客户端挂载，避免 SSR 访问 `document` 和 `defaultOpen` 水合首帧不一致。
- 产品文案、表单和业务按钮均留在示例层；外层示范受控模式，内层示范非受控模式。
- 已配置 ESM 包、React peer dependencies、声明文件、受限公开出口及可打包产物。
- API、核心边界、测试矩阵和三产品渐进迁移方案已写入 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-n9qz4afd/README.md:7)。

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：2 项通过
- `npm run build`：应用和库构建通过
- `npm pack --dry-run`：通过，仅包含 5 个预期发布文件
- `git diff --check`：通过
- Playwright 行为测试已增强但未能实际执行：沙箱禁止监听 `127.0.0.1:4173`；绕过服务器后 Chromium、WebKit、Firefox 进程也被系统沙箱拒绝启动。因此未声称浏览器套件通过，需在允许启动浏览器的 CI/本机补跑 `npm run test:browser`。

`.frontend-architect` 内容保持未改动。