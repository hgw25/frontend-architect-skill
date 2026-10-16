## 审查发现

1. **中等｜可维护性：完整导出流程的编排责任被泄漏并复制到两个入口。**  
   [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-a98m1pa3/after/src/toolbar.mjs:3) 与 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-a98m1pa3/after/src/keyboard.mjs:3) 都必须知道并重复 `begin → classify → encode → dispatch` 的内部顺序。真实调用者只需要“导出选择”，也没有暂停或单独复用准备阶段的需求。以后增加导出元数据、调整编码协议或插入新阶段时，需要同步修改所有入口；漏改一个入口会造成行为分叉。重构前由 [export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-a98m1pa3/before/src/export-selection.mjs:8) 独占这一顺序，两个入口只依赖完整操作，职责和依赖方向更清楚。  
   这是有现实扩散路径的维护性退化，不是当前功能错误。

2. **中等｜可维护性：阶段函数通过半初始化的可变上下文形成隐式时序契约。**  
   [export-steps.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-a98m1pa3/after/src/export-steps.mjs:1) 创建含 `undefined` 字段的 context，随后由 `classify` 和 `encode` 原地补齐；[dispatch](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-a98m1pa3/after/src/export-steps.mjs:20) 则假定前两步已经按正确顺序执行。单看函数签名无法得知：

   - `encode` 必须在 `classify` 后调用，否则访问 `decision.kind` 会失败。
   - `dispatch` 必须在 `encode` 后调用，否则 ready 分支可能提交 `undefined`。
   - 重新 `classify` 后，已有 `payload` 不会失效，可能与新 decision 不一致。

   当前两个调用者顺序正确，所以这些不是已触发的功能缺陷；问题在于不存在真正可独立使用的阶段，却引入了无效中间状态和隐藏顺序依赖。更内聚的边界仍应是一个完整的 `exportSelected(rows, write)` 操作，内部可以保留纯决策 helper，而无需把机械步骤暴露给调用者。

## 结论

没有发现当前功能错误；`after/` 保持了 README 规定的外部行为。但这次重构没有改善职责或内聚，反而把一个原本完整、单点维护的导出操作拆成了调用者必须了解的可变协议，增加了入口间耦合与后续改动的扩散范围。判断依据不是函数数量、文件数量或循环写法，而是真实调用 API 和可验证的时序依赖。

验证情况：

- 审阅了两版 README、全部源码、两个真实入口及测试。
- `before/`：10/10 测试通过。
- `after/`：10/10 测试通过。
- `git diff --no-index` 返回 1，仅表示快照存在差异。
- 工作区无修改。