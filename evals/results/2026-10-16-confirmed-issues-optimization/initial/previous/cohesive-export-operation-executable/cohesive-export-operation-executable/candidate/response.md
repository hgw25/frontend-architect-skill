已完成重构，保持 README 的两个公开入口及全部行为不变。

- [selection-export.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-zubcux_o/src/selection-export.mjs:1) 将选择判定作为纯规则，并由单一 `exportSelection` 拥有判定、写入和结果返回的完整执行链。
- 移除了依赖调用顺序和隐藏可变状态的 `begin/classify/encode/dispatch` 工作流。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-zubcux_o/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-zubcux_o/src/keyboard.mjs:1) 通过明确的导出别名共享同一操作，没有重复转发链。
- ID 快照仍在异步写入前生成，保留顺序、全有或全无、单次写入和错误透传语义。

以后若需要细化不可导出状态或返回阻塞原因，变化集中在决策函数；入口和传输协议无需跟着拆改。若仅升级 payload schema，则只影响主操作的协议边界。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过
- `git diff --check`：通过
- README、现有测试和 `.frontend-architect` 均未修改

仍未证明的是浏览器界面触发和真实 transport 集成；现有仓库只提供了函数边界的 Node 测试，因此本次结论限定于 README 所述公开契约。