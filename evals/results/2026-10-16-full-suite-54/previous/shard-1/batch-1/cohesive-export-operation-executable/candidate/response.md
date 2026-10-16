已完成导出逻辑重构，保持 README 中两个公开入口及全部行为不变。

- 新增内聚操作 [selection-export.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-ojbgltm_/src/selection-export.mjs)：集中负责整批判定、稳定 ID 快照、协议编码、单次提交和结果返回。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-ojbgltm_/src/toolbar.mjs) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-ojbgltm_/src/keyboard.mjs) 只保留各自入口边界，不再了解或驱动中间步骤。
- 删除可被乱序调用的 `begin/classify/encode/dispatch` 和共享可变 context。
- 结构检查采用现实变化“增加右键菜单导出入口”：新入口只需调用完整的 `exportSelection`，无需复制步骤或掌握调用顺序。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- 三个源文件均通过 `node --check`。
- `git diff --check` 通过。
- README、既有测试和 `.frontend-architect` 均未修改。

仍未证明的是实际浏览器中的工具栏/键盘事件接线及真实传输集成；当前仓库只提供函数级入口和模拟 `write`，现有检查覆盖了公开函数契约、全有或全无、顺序、单次写入、等待期间快照稳定性及错误透传。