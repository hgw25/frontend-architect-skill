已在 [docs/dialog-primitive-spec.md](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-baseline-940h6p3w/docs/dialog-primitive-spec.md) 落了一份可发布的 headless Dialog primitive 规格，前提是这个仓库当前为空基线，只有 `.git`，没有现有 React 代码可供复用或对齐，所以我没有伪造任何仓库现状。

这份规格已经把关键决策定死了：发布独立包 `@acme/dialog`，采用 `Root + Trigger + Portal + Overlay + Content + Title + Description + Close` 的 compound API；支持 `portal`、受控/非受控、嵌套 Dialog、SSR/hydration、自定义样式；明确把焦点管理、dismiss 行为、stack 管理、SSR 稳定 id 放在 primitive 内部，把业务文案、按钮和视觉样式排除在外。文档里还包含了公开 props 契约、导出策略、内部实现边界、测试矩阵，以及按 “先 primitive、再产品 adapter、再逐步替换高风险弹窗” 的迁移方案。

没有补运行时代码或测试，因为当前仓库没有现成包结构、构建工具或测试基线；在这种前提下直接写实现会引入虚构约束。下一步如果你要我继续，我建议直接把这份 spec 落成真实包骨架：`packages/dialog`、导出入口、基础测试和一个最小可用实现。