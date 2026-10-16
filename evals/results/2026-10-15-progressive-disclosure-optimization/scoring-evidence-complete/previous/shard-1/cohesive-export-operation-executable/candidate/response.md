已完成导出流程重构，保持 README 中两个公开入口及全部行为不变。

- 新增 [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-44s439g0/src/export-selection.mjs:1)，以单一 `exportSelection` 操作内聚判定、写入和结果返回。
- 删除要求调用者按顺序执行的 `begin/classify/encode/dispatch` 可变上下文协议。
- [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-44s439g0/src/toolbar.mjs:1) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-cohesive-export-operation-executable-candidate-44s439g0/src/keyboard.mjs:1) 现在仅承担公开入口接入。
- 按本地 Skill 的建议，保留了纯资格判定边界，但让传输顺序直接呈现在主执行链中，避免无意义的转发层。
- 后续新增入口、修改资格规则或升级写入协议都有明确且集中的修改位置，无需入口了解内部步骤。

验证结果：

- `node --test test/export.test.mjs`：10/10 通过。
- `git diff --check`：通过。
- README、现有测试和 `.frontend-architect` 均未修改。

仍未证明的是浏览器事件绑定及真实传输服务的端到端集成；当前仓库只提供可注入的可信 `write` 能力，因此现有检查证明的是两个公开入口及导出操作的本地契约。