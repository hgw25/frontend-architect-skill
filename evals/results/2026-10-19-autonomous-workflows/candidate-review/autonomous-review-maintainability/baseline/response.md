## 审查发现

- [P2] 将完整导出流程重新收口到共享函数 — [toolbar.mjs:4](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-maintainability-baseline-nf1ye4xs/after/src/toolbar.mjs:4)

  `begin → classify → encode → dispatch` 的顺序和完整性现在由工具栏、键盘两个入口分别维护，[keyboard.mjs:4](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-review-maintainability-baseline-nf1ye4xs/after/src/keyboard.mjs:4) 已出现同样的编排。后续增加审计、修改编码步骤或调整调用顺序时，很容易只更新一个入口；任一步骤漏调或乱序还会因可变 `context` 产生运行时错误。README 已明确这是不可暂停的单次操作，因此应保留一个共享的 `exportSelected(rows, write)` 负责完整流程，两个入口只委托给它；步骤若仍有价值，可以保留为该模块的私有实现。

其余公开契约未发现行为回归。已运行 `after` 的 `node --test test/export.test.mjs`，10 项测试全部通过。未修改任何快照文件。