已完成可发布的 headless Dialog primitive，并迁移现有示例，保留原有可观察行为。

- [核心实现](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/src/Dialog.tsx>)：compound API、受控/非受控状态、Portal、ARIA 关联、Escape、焦点陷阱与恢复。
- [层级管理](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/src/dialog/layers.ts>)：嵌套 Dialog 仅由顶层处理键盘和外部点击，并统一管理背景 `inert`、`aria-hidden` 和滚动锁定。
- [焦点模块](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/src/dialog/focus.ts>)：初始焦点、Tab 顺序、正反向循环及 radio group。
- [公开入口](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/src/index.ts>)：导出 `Root/Trigger/Portal/Overlay/Content/Title/Description/Close` 及完整类型。
- [发布配置](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/package.json>)：ESM、声明文件、React peer dependencies、受限 package exports 和 pack 检查。
- [设计、测试矩阵与三产品迁移方案](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-5g39mhup/README.md>) 已落盘。按照本地 Skill，将公开契约、焦点策略和文档层级生命周期拆成独立边界。

验证结果：

- `npm run typecheck`：通过
- `npm run test:ssr`：2/2 通过
- `npm run build`：示例与 ESM/声明产物构建通过
- 发布产物公共入口 `renderToString`：通过
- `npm run test:package`：通过
- `git diff --check`：通过
- Playwright 已尝试执行，但沙箱禁止监听 `127.0.0.1:4173`（`EPERM`）；直接启动 Chromium、Firefox、WebKit 也被系统进程权限终止。因此新增的四条真实浏览器用例已保留，但本环境无法完成浏览器断言，需在允许启动浏览器和本地端口的环境运行 `npm run test:browser`。