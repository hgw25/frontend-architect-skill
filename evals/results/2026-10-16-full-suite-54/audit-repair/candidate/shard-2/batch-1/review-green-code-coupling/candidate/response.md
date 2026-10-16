## 审查发现

- **中等｜可维护性退化：完整导出操作被拆成需要调用者手工编排的可变流程。**  
  工具栏和键盘入口都复制了 `begin → classify → encode → dispatch` 顺序：[toolbar.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-68cc3jxw/after/src/toolbar.mjs:4)、[keyboard.mjs:4](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-68cc3jxw/after/src/keyboard.mjs:4)。与此同时，[export-steps.mjs:1](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-68cc3jxw/after/src/export-steps.mjs:1) 创建含 `undefined` 字段的上下文，后续步骤原地补全，并隐含依赖调用顺序：`encode` 要求已完成 `classify`，[dispatch:20](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-68cc3jxw/after/src/export-steps.mjs:20) 又要求 ready 分支已经执行过 `encode`；漏掉后者会把 `undefined` 交给 `write`。这些前置条件没有体现在函数输入或返回值中。

  这使入口层了解了原本属于导出能力内部的准备步骤，降低了操作内聚性并增加时序耦合。新增第三个入口需要再次复制流程；以后若增加、合并或调整一个步骤，所有入口都必须同步修改，遗漏后仍可能形成表面合法的调用。原实现的 [exportSelected](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-68cc3jxw/before/src/export-selection.mjs:8) 已把决策、编码、发送及返回结果封装为一个与业务契约一致的原子操作，因此 `after/` 在职责、耦合和后续修改成本上没有改善，反而退化。

  建议恢复一个供真实入口调用的完整导出函数；若 `classify` 或编码逻辑值得独立保留，可作为该操作内部的纯函数或私有辅助函数，而不是要求调用者维护可变上下文和步骤顺序。这不是要求固定函数数量或文件布局。

## 功能判断

未发现当前公共行为的功能错误。两版分别运行：

```text
node --test test/export.test.mjs
```

均为 **10/10 通过**，覆盖空选择、全有或全无、顺序与单次写入、原错误传播、等待期间 ID 稳定性，以及工具栏和键盘两个真实入口。

结论仅针对现有快照和这些调用者；未修改任何文件。指南也促使本次审查把问题落在真实的调用顺序与可变状态契约上，而没有把拆函数、循环写法或文件数量本身当作缺陷。