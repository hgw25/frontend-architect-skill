## 审查发现

- **中等：导出操作被拆成需要调用者手工维护的时序协议，职责与耦合均退化。**  
  工具栏和键盘入口现在分别重复 `begin → classify → encode → dispatch`：[toolbar.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-vioqb3y6/after/src/toolbar.mjs:4)、[keyboard.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-vioqb3y6/after/src/keyboard.mjs:4)。这使两个交互入口必须了解导出的内部阶段和顺序，而 README 明确说明导出是一次完整操作、不需要可暂停流程。以后增加或重排阶段时，需要同步修改所有调用者，入口之间可能漂移。原版由 `exportSelected` 集中拥有“判定、编码、写入、返回结果”的执行链，两个入口只负责触发，更符合实际职责。建议恢复一个完整的导出操作入口；判定或编码仍可作为其私有帮助函数存在。

  同一问题还体现在共享可变上下文：[export-steps.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-vioqb3y6/after/src/export-steps.mjs:1) 创建含 `undefined` 字段的半成品，后续函数依赖先前函数正确修改它。例如漏掉 `classify` 会在 `encode` 中访问 `undefined.kind`，漏掉 `encode` 则可能把 `undefined` 交给 `write`。当前真实调用者顺序正确，因此这是**可维护性问题，不是当前功能错误**；但它增加了无效中间状态、隐式前置条件和内部误用面。

## 结论与验证

当前公开功能没有发现错误：空选择、全有或全无、顺序、单次写入、错误透传及等待期间 ID 稳定性均保持一致。两版分别运行 `node --test test/export.test.mjs`，都是 **10/10 通过**。

不过此次重构没有改善内聚或扩展性，反而把一个本来完整且单一的业务操作拆成由 UI 调用者协调的流程。判断依据是实际调用链和契约，而不是函数数量、文件数量或循环写法。未修改任何夹具文件，工作树保持干净。