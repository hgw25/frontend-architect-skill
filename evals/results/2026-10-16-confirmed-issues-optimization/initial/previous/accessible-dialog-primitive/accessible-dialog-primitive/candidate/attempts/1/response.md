已修复宿主反馈中的焦点恢复缺陷。

根因是 React `StrictMode` 会重放 layout effect。旧实现首次 setup 后立即清空返回焦点目标，第二次 setup 错把 Dialog 内输入框记录为目标；关闭后输入框被卸载，因此无法恢复焦点。

修复内容：

- 在整个打开周期内保留原始焦点目标。
- effect 重放时取消旧恢复任务，但不丢失目标。
- 真实关闭并完成恢复后才清理目标。
- 增加与宿主路径一致的遮罩关闭、等待两帧、恢复 trigger 回归测试。

相关位置：

- [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/src/Dialog.tsx:230)
- [dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-d6_0d7rn/tests/dialog.spec.ts:37)

验证结果：

- TypeScript：通过
- SSR：2/2 通过
- Demo 生产构建：通过
- 发布包及声明构建：通过
- 公共包入口导入：通过
- `npm pack --dry-run`：通过，7 个文件、约 6.8 kB
- Playwright 测试发现：4 个测试，包含新增回归场景
- `git diff --check`：通过
- 只读宿主验收脚本：未修改

当前环境仍无法执行真实浏览器：Vite 监听被 `EPERM` 阻止，直接启动 Chromium 又被 macOS Mach IPC 权限拒绝，两者都发生在页面代码运行前。因此宿主环境仍需重新运行：

```bash
node scripts/check-dialog-contract.mjs
```

本地 frontend-architect 生命周期指导促使此次修复把焦点目标视为完整打开会话所拥有的状态，避免再被 StrictMode 的探测性清理消费。