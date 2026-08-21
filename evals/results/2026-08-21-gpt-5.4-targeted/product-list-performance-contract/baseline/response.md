我检查了工作区，当前仓库没有业务源码可供进一步定位，`HEAD` 只有一个空提交 `a5ff0eb`。所以我没有虚构实现细节，而是把基于你给出的 RUM 和实验室信号的最小调查/修复方案落成到 [performance-response-plan.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-product-list-performance-contract-baseline-xkjv_f0n/performance-response-plan.md:1)。

结论上，最小顺序应该是先查并回收首路由新增的 `95KB gzip JS`，再处理新的首屏字体阻塞，之后再拆筛选时的 `180ms` 长任务。这个顺序的理由很直接：JS 增量同时解释 `LCP` 和 `INP` 恶化，字体更像 `LCP` 的单点拖累，筛选长任务则是 `INP` 的直接证据，但不该先上来就假设要重写列表。

我在文档里同时定义了可执行门槛：RUM 目标为移动端 `p75 LCP <= 2.5s`、`p75 INP <= 200ms`、`p75 CLS <= 0.1`；实验室预算为首路由净新增 JS 不超过 `30KB gzip`、首屏关键路径字体阻塞为 `0`、筛选最长任务 `<100ms`。发布上分成“可灰度 / 可放量 / 必须回滚”三档，明确要求看分桶 RUM 和可重复 trace，不把某一次 Lighthouse 分数当结论。