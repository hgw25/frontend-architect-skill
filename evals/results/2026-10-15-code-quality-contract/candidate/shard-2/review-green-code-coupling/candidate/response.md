## 审查发现

**中等优先级｜可维护性问题，不是功能错误：共用导出操作被改成了调用者必须编排的时序协议。**

工具栏和键盘入口现在都需要依次调用 `begin → classify → encode → dispatch`：[toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-cq8i3msz/after/src/toolbar.mjs:1)、[keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-cq8i3msz/after/src/keyboard.mjs:1)。

这套步骤依赖共享的可变 `context` 和隐式顺序：[export-steps.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-cq8i3msz/after/src/export-steps.mjs:1)。例如：

- `encode` 假定 `classify` 已写入 `decision`，否则读取 `undefined.kind`。
- `dispatch` 假定成功决策已经经过 `encode`，否则可能把 `undefined` 交给 `write`。
- 新增入口必须了解四个步骤、共享对象结构和正确顺序。
- 今后若增加一个强制步骤或调整顺序，所有入口都要同步修改，容易产生入口间行为漂移。

而需求明确说明导出是一个不可暂停的完整操作，调用者不需要准备阶段工作流：[after/README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-cq8i3msz/after/README.md:3)。因此这些阶段没有形成可独立使用的能力，反而把导出内部执行逻辑泄漏给了触发入口。

重构前的 `exportSelected(rows, write)` 将决策、编码和一次写入作为一个连贯用例，并由两个入口通过一个稳定调用契约复用：[export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-cq8i3msz/before/src/export-selection.mjs:8)。更合适的方向是保留一个负责完整流程的协调函数；分类或编码若确有独立规则，可以作为其私有、优先返回值式的辅助逻辑，不让入口维护准备顺序。

## 结论

这次重构没有改善整体结构：

- 职责：工具栏和键盘入口从“触发导出”扩张为“编排导出内部阶段”。
- 内聚：一个完整业务操作被拆成不能安全独立调用的步骤。
- 耦合：调用者从依赖一个用例接口，变为依赖四个函数、共享上下文形状及调用顺序。
- 执行逻辑：当前两个入口的顺序正确，行为仍符合契约；问题在于正确性依赖调用者记住隐式协议。
- 后续维护：新增入口或新增强制阶段时，修改面和漏改风险都增大。

**未发现功能错误。** 两版分别运行 `node --test test/export.test.mjs`，均为 10/10 通过，覆盖空选择、全有或全无、顺序与单次写入、错误透传及等待期间 ID 稳定性。仓库没有提供其他 lint、类型或浏览器检查；本次能力是纯模块逻辑，不需要浏览器验证。所有夹具及 `.frontend-architect` 文件均未修改。