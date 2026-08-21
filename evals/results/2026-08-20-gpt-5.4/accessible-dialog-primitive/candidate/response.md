已在 [dialog-primitive-proposal.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-accessible-dialog-primitive-candidate-kvbon871/dialog-primitive-proposal.md) 落了一份可评审方案。基于当前 workspace 的真实情况，这里没有任何 React 源码、包结构或现有 Dialog 实现可检查，所以我没有伪造“现状改造 diff”，而是给出一份可发布的 headless Dialog primitive 设计。

核心决策是新增一个共享包 `@acme/dialog`，只负责可访问性、焦点管理、Escape/外部点击关闭、portal、嵌套栈、SSR/水合安全，以及受控/非受控状态；不负责业务文案、按钮布局和样式主题。文档里已经明确了组件边界（`Root/Trigger/Portal/Overlay/Content/Title/Description/Close`）、推荐公开 API、`package.json` 导出策略、测试矩阵，以及按“兼容包装层 -> 分产品渐进迁移 -> 下线旧实现”的迁移方案。

我还把一个关键实现取舍写死了：`Portal` 默认服务端不直接挂到 `document.body`，避免 SSR/hydration 不一致；嵌套 Dialog 只允许最上层实例接管焦点陷阱、滚动锁和 `Escape`。这两个点是这类基础组件最容易在跨产品接入时出问题的地方。

这次没有运行测试，因为仓库里没有可执行的 React 工程或测试配置。下一步如果你要我继续，我可以直接在这个 workspace 里把 `@acme/dialog` 的真实包骨架和首版实现搭起来。