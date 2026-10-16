已完成可发布的 headless Dialog primitive，并保留原示例的文案、输入、嵌套弹窗和关闭行为。

- [核心实现](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/src/Dialog.tsx:23)：受控/非受控状态、SSR 安全 portal、焦点循环与恢复、顶层 Escape、嵌套层栈、背景 `inert`/`aria-hidden`、ARIA 标注及样式/ref 转发。
- [示例迁移](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/src/App.tsx:5)：产品文案、表单和业务按钮留在产品层；外层使用受控模式，内层覆盖非受控嵌套模式。
- [包根导出](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/src/index.ts:1)：提供 `Dialog.*` compound API、具名组件及 Props 类型。
- [发布配置](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/package.json:1)：ESM、类型声明、peer dependencies、根 `exports` 和可打包文件范围。
- [设计与迁移文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/README.md:1)：记录公开 API、实现边界、测试矩阵和三个产品的增量迁移/回退方案。
- [真实浏览器测试](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-c_c81s17/tests/dialog.spec.ts:26)：覆盖水合、ARIA、portal、正反向 Tab、焦点逃逸、Escape、嵌套恢复和 backdrop。

验证结果：

- `npm run check`：通过
  - TypeScript 类型检查
  - 2 个 Node SSR 测试
  - 应用及库产物构建
  - 3 个真实 Chromium/Playwright 行为测试
- 包根实际导入检查：通过
- `npm pack --dry-run`：通过，发布包仅包含 README、ESM、声明文件和 package metadata。