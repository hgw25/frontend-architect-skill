已在仓库新增方案文档 [booking-confirmation-rollout-plan.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-risky-booking-rollout-baseline-m557_uo0/booking-confirmation-rollout-plan.md)。

仓库里没有现成前端代码，只有 `.git`，所以我没有虚构页面实现细节，而是交付了一份可渐进发布的前端改造设计。核心决策是：用单一 `BookingConfirmationDataSource` 适配层隔离旧/新接口；读路径和写路径分开灰度；所有写请求绑定 `bookingAttemptId`/`idempotencyKey`；任何超时或 5xx 都进入 `submitted_unknown` 并先做状态对账，不能直接放开用户再次提交；回滚必须是运行时开关，不依赖重新发版。

文档里已经覆盖了你要求的边界和策略：兼容边界、分阶段灰度、重复提交与跨 tab 防护、错误恢复状态机、生产指标与告警、隐私最小化、以及明确的回滚触发条件。最关键的约束也写清了：如果后端不能对新旧接口都提供服务端幂等保证，这次写路径切换不应放量。

当前变更未包含代码或测试，因为仓库没有业务文件可接入。