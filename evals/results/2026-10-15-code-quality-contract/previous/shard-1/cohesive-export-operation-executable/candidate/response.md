已完成实际重构，并保持 README 中两个公开入口及行为不变。

- 新增集中式导出操作：[export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-lntq8uxw/src/export-selection.mjs:1)
  - 纯判定逻辑负责 empty/blocked/ready。
  - 主链清晰呈现“判定 → 构造载荷 → 写入 → 返回 sent”。
  - 不再使用隐式顺序依赖和可变 context。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-lntq8uxw/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-lntq8uxw/src/keyboard.mjs:1) 现在只承担公开入口适配。
- 删除了可被乱序调用的 `begin/classify/encode/dispatch` 阶段接口。
- 未修改 `.frontend-architect`、README 或既有测试。

现实变化检查：若后续导出协议升级 schema 或增加固定元数据，只需调整 `createExportPayload`；若 eligibility 规则变化，则集中修改 `decideExport`，两个入口都无需了解这些细节。这符合本地 Skill 关于职责所有权和可读主执行链的指导。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- 三个源文件 `node --check` 通过。
- `git diff --check` 通过。

仍未证明：当前仓库只提供 Node 行为测试，因此没有验证真实浏览器中的工具栏/键盘事件绑定，也没有验证生产传输端对载荷的实际接收；这些集成环境不在现有工作区内。