已完成重构，并保持 README 中两个公开入口及全部行为不变。

- 新增 [selection-export.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-j6_4f05e/src/selection-export.mjs)，由单一 `exportSelection` 持有“决策→写入→返回结果”的完整执行链。
- 资格判断成为无副作用的内部规则，不再通过可变 context 隐式传递状态。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-j6_4f05e/src/toolbar.mjs) 和 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-j6_4f05e/src/keyboard.mjs) 保留稳定公开边界，共用同一领域操作。
- 删除了要求调用者掌握步骤顺序的 `export-steps.mjs`。

用“增加第三个导出入口或升级提交 payload”作为后续变化检查：新入口只需调用 `exportSelection`，传输协议也只有一个修改位置，无需复制编排链或引入工作流框架。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过
- `git diff --check`：通过
- 确认源码中没有残留旧分步 API 引用

仍未证明的是浏览器 UI 集成和真实 transport 实现；当前仓库没有对应运行环境或集成检查。