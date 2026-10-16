结论：`after/` 保持了公开功能，但职责、内聚和耦合均未改善，整体可维护性反而下降。未发现当前公开调用路径的功能错误。

### 审查发现

1. **中等｜可维护性：入口被迫了解并复制完整执行协议**

   [toolbar.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-gvxf3htf/after/src/toolbar.mjs:1) 和 [keyboard.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-gvxf3htf/after/src/keyboard.mjs:1) 都需要知道 `begin → classify → encode → dispatch` 的顺序。新增入口或增加一个准备步骤时，所有调用者都必须同步修改；遗漏或错序会使不同入口悄然分叉。

   这与仓库声明的“导出是一个操作、不需要可暂停准备流程”不匹配：[after/README.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-gvxf3htf/after/README.md:3)。

   `before/` 的共享 `exportSelected` 自己拥有完整执行顺序，两个真实调用者只委托一次，后续规则变化有单一修改位置：[export-selection.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-gvxf3htf/before/src/export-selection.mjs:8)。

   建议保留一个完整的 `exportSelected(rows, write)` 操作边界；分类或编码若值得命名，可以作为其私有实现细节。

2. **低等｜可维护性：可变 context 引入无效状态和隐式时序耦合**

   [export-steps.mjs](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-review-green-code-coupling-candidate-gvxf3htf/after/src/export-steps.mjs:1) 创建了 `decision`、`payload` 都未定义的对象，后续函数再依次修改它。各步骤的签名没有表达前置条件：

   - 未先 `classify` 就 `encode` 会读取未定义的 `decision`。
   - 已 `classify` 但漏掉 `encode` 时，`dispatch` 会把 `undefined` 交给 `write`；若 transport 接受它，仍会返回 `sent`。
   - 数据来源和副作用结果隐藏在共享对象中，单看调用或返回值无法判断步骤产出了什么。

   现有两个入口顺序正确，因此这不是当前功能错误；它是重构人为制造的脆弱内部协议。用显式返回值传递 `decision`/`payload`，或把顺序封装回单一操作，可消除这些无效状态。

### 功能与验证

两版均执行：

```text
node --test test/export.test.mjs
```

结果均为 `10/10` 通过，覆盖空选择、全有或全无、顺序与单次写入、输入不变、错误透传以及等待期间 ID 快照稳定性。因此现有公开契约未见回归。

未修改任何文件，最终 `git status --short` 为空。