已修复宿主发现的焦点恢复缺陷。

根因是 React Strict Mode 重放 layout effect 时，第二次把 Dialog 内的输入框误记为回焦目标。现在 [Dialog.tsx](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/src/Dialog.tsx:222) 按一次打开会话保存原始焦点：

- Strict Mode 重放不会覆盖触发器。
- 自动聚焦回调每次打开只执行一次。
- 真实关闭后才恢复焦点并清理会话。
- 保留 `finalFocusRef` 和可取消的 `onCloseAutoFocus` 契约。

在 [dialog.spec.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-11c1jq5w/tests/dialog.spec.ts:22) 增加了与宿主脚本一致的回归链路：overlay 关闭、回焦、重新打开、Escape 关闭、再次回焦。只读宿主脚本未修改。

已通过：

- `npm run typecheck`
- `npm run test:ssr`，2 项通过
- `npm run build`
- `npm run check:package`
- `npm pack --dry-run --cache /tmp/codex-dialog-npm-cache`
- `git diff --check`

浏览器验证仍受当前沙箱限制：

- `npm run test:browser`：监听 `127.0.0.1:4173` 被 `EPERM` 拒绝。
- `node scripts/check-dialog-contract.mjs`：监听端口被 `EPERM` 拒绝。
- 直接启动 Chromium：macOS Mach port 注册被权限策略拒绝。

因此实现和回归用例已修复，但真实 Chromium 结果需要宿主环境重新运行上述两个浏览器命令确认。