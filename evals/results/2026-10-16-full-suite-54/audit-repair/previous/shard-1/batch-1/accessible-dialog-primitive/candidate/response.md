已完成可发布的 headless Dialog primitive：

- Compound API：`Root / Trigger / Portal / Overlay / Content / Title / Description / Close`，支持受控/非受控状态、事件原因、ref 与原生样式属性。[Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-zichafsg/src/dialog/Dialog.tsx:25)
- 私有焦点层负责焦点进入/循环/恢复、背景隔离、嵌套层级及仅顶层响应 Escape。[focusScope.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-zichafsg/src/dialog/focusScope.ts:12)
- Portal 避免服务端访问 DOM，并保持首次水合结构一致。
- 示例保留原有文案与交互；父 Dialog 为受控、子 Dialog 为非受控，业务内容均留在产品层。[App.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-zichafsg/src/App.tsx:6)
- 增加 ESM 包导出、React peer dependency、声明文件、`use client` 产物及打包流程。[package.json](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-zichafsg/package.json:1)
- 核心边界、API、测试矩阵与三产品渐进迁移方案已记录在 [README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-zichafsg/README.md:1)。

验证结果：

- TypeScript：通过
- SSR 测试：2/2 通过
- package 与 demo 生产构建：通过
- 包自引用导入：通过
- `npm pack --dry-run`：通过，产物约 7.5 kB
- Playwright 三项行为测试已扩展且未弱化，但当前沙箱禁止启动 Chromium（Mach rendezvous `Permission denied`）；Firefox/WebKit 同样在启动阶段被系统终止，因此浏览器断言未实际执行。可在允许启动浏览器的环境运行 `npm run test:browser`。

`.frontend-architect` 未作任何修改。