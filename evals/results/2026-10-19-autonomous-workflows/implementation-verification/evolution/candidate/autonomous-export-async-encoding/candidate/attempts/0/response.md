已完成异步编码接入。

- [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-export-async-encoding-candidate-3c0_bjvd/src/export-selection.mjs:1) 现在先快照所选 ID，再等待 `encodeSelection`。
- 仅编码成功后调用 `write`；编码和传输错误均保持原对象向调用者抛出。
- 编码期间选择变化不会影响已提交意图。
- Toolbar 与 Keyboard 两个公开入口及原有返回行为保持不变。
- 已按本地 frontend-architect Skill 的异步生命周期指导同步 [设计文档](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-export-async-encoding-candidate-3c0_bjvd/docs/export-capability.md:1)。

验证结果：

- `node --test`：16/16 通过
- `git diff --check`：通过
- 指定的只读 harness 与 `src/codec.mjs` 均未修改。