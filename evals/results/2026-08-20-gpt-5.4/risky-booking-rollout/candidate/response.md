当前 workspace 里只有 `.frontend-architect` 指南，没有实际应用代码或现有接口定义，所以我不能把方案绑定到具体模块名。下面给的是可直接落地到高流量预订确认页的前端迁移设计，重点是把“重复预订”风险压到最低，而不是追求一次切流成功。

**核心决策**

1. 把旧接口和新接口都收敛到一个前端兼容层，再让页面只消费一个稳定的领域模型。
2. 预订提交必须始终是“单写路径”：一次用户尝试只能命中一个后端版本，绝不能前端同时调用旧、新两个下单接口。
3. 灰度单位用“会话/用户粘性分流”，不是按单次点击随机分流；同一预订流程内版本必须固定。
4. 没有服务端幂等键时，不应把新接口放到真实下单流量上；前端只能减轻重复点击，不能从根上保证不重复创建订单。

**兼容边界**

建议先加一个独立的数据访问层，例如 `BookingConfirmationGateway`，对页面暴露稳定契约：

- `loadConfirmationContext() -> ConfirmationViewModel`
- `submitBooking(input, attemptId) -> SubmitResult`
- `resolveAttempt(attemptId) -> AttemptStatus`

这个兼容层负责：

- 把旧、新接口响应都归一成同一个 `ConfirmationViewModel`
- 归一错误类型，而不是把 HTTP/后端错误码直接泄漏给页面
- 归一“未知结果”状态，例如超时、断网、502、客户端中断
- 屏蔽接口版本差异，避免组件里出现 `if apiVersion === 'legacy'`

页面状态建议最少包含这些互斥状态：

- `ready`
- `submitting`
- `submitted`
- `submit_failed_retryable`
- `submit_failed_terminal`
- `submit_unknown_resolving`

`submit_unknown_resolving` 很关键。它表示“用户点了提交，但前端暂时不能确认是否成功”，此时不能直接放开再次下单。

**渐进交付与灰度**

按阶段上线，不做一次全量切换：

1. 第 0 步：先上线兼容层，不改业务行为  
   旧接口仍为唯一真实来源，前端完成模型归一、状态机、遥测埋点、attemptId 生成。

2. 第 1 步：读路径 shadow compare  
   页面继续使用旧接口结果渲染；后台并行拉新接口做比对，但新接口结果不参与用户决策。  
   只记录：
   - 字段缺失
   - 关键值不一致
   - 新接口耗时/错误率

3. 第 2 步：小流量真实读切换  
   先把“加载确认页数据”切到新接口，提交仍走旧接口。  
   这样先验证读模型兼容性，不碰重复预订风险最高的写路径。

4. 第 3 步：提交路径小流量切换  
   只在确认满足以下条件后切：
   - 服务端支持幂等键
   - 前端有未知结果恢复机制
   - 已有 kill switch
   - 已建立告警与人工值守

5. 第 4 步：逐步扩容  
   建议按 `1% -> 5% -> 25% -> 50% -> 100%`，每档至少观察一个完整业务周期。  
   分流要“粘住”到用户或会话，避免刷新后版本漂移。

灰度控制建议拆成两个独立开关：

- `confirmation_read_version`
- `confirmation_submit_version`

这样读、写可以独立回滚。

**幂等与重复提交**

前端要做两层保护，但要明确：真正的幂等必须由服务端保证。

前端层：

- 首次进入确认页就生成 `attemptId`
- 提交按钮点击后立即进入 `submitting`，阻止二次点击
- 同一个 `attemptId` 的 in-flight 请求只允许一个
- 页面刷新后仍要能恢复 `attemptId`，建议放 `sessionStorage`
- 如果用户返回页内再次尝试，必须生成新的 `attemptId`，但只能在上一次状态明确结束后允许

服务端协同层：

- 每次提交都带 `attemptId`/`Idempotency-Key`
- 服务端必须保证同一个 key 重试不会生成第二笔预订
- 超时后前端不能默认失败并重提，必须先 `resolveAttempt(attemptId)`

如果当前后端没有“按幂等键查询结果”的能力，最少也要有一个“按 attemptId/quoteId 查询是否已创建预订”的恢复接口；否则未知结果场景下前端无法安全恢复。

**错误恢复**

要把错误分成三类，而不是统一 toast：

1. 可重试失败  
   例如网络抖动、网关超时、限流。  
   行为：
   - 不立即生成新 attempt
   - 先自动或手动触发 `resolveAttempt`
   - 只有确认未落单，才允许“重试本次提交”或“发起新尝试”

2. 终态失败  
   例如库存失效、价格变化、会话过期、参数校验失败。  
   行为：
   - 明确提示原因
   - 引导回上一步刷新价格/库存
   - 不做隐式重试

3. 未知结果  
   例如客户端断网、浏览器关闭前收到不完整响应。  
   行为：
   - 进入“正在确认预订状态”
   - 轮询或手动查询结果
   - 查询到成功则展示成功页
   - 查询到失败且未创建订单，才允许重新提交

这里最忌讳的行为是：`catch -> 提示失败 -> 让用户再点一次`。这正是重复预订的入口。

**生产信号**

至少要有这些信号，且按 `legacy/new`、灰度 cohort、设备、地区、浏览器版本分段：

- `confirmation_load_success_rate`
- `confirmation_load_p95_latency`
- `submit_start_count`
- `submit_success_rate`
- `submit_retryable_error_rate`
- `submit_terminal_error_rate`
- `submit_unknown_rate`
- `attempt_resolution_success_rate`
- `duplicate_click_blocked_count`
- `idempotency_conflict_count`
- `legacy_new_shadow_mismatch_rate`
- `booking_created_but_ui_failed_count`
- `ui_retry_after_unknown_count`

高优先级告警看这几项：

- `submit_unknown_rate` 突增
- `attempt_resolution` 失败率突增
- 新接口相对旧接口成功率显著下降
- shadow compare 中关键字段不一致率升高
- 任何已确认重复预订事件

**隐私控制**

确认页通常带强隐私数据，埋点和日志必须做最小化：

- 不记录姓名、手机号、邮箱、证件号、支付信息、完整地址
- 不上传完整预订 payload；只上传 allowlist 后的字段
- `attemptId` 可以记录，用户标识尽量哈希或使用内部匿名 ID
- compare diff 只记录“字段名 + 是否不一致”，不要打原值
- 会话回放、错误上报、第三方分析 SDK 默认关闭敏感字段采集
- 敏感页上的第三方脚本要受 consent 和开关控制，事故时可单独禁用

**回滚条件**

不要把回滚定义成“感觉不对”。建议明确成操作条件：

- 任何已确认由新路径导致的重复预订，立即把 `confirmation_submit_version` 回滚到旧接口
- 新提交路径成功率相对旧路径下降超过预设阈值，立即停止扩容
- `submit_unknown_rate` 或 `attempt_resolution` 失败率超过阈值，立即停止扩容，必要时回滚
- shadow compare 出现关键业务字段不一致，禁止把读路径继续放量
- 发生隐私泄漏、敏感数据入日志/埋点，立即关闭相关遥测并回滚问题版本

回滚能力要独立：

- 读路径能单独回滚
- 写路径能单独回滚
- 埋点/compare 能单独关闭
- 新旧兼容层保留两周并行窗口内都可运行

**推荐的最小落地顺序**

1. 先做前端兼容层、状态机、attemptId、埋点。
2. 只开 shadow compare，不改真实行为。
3. 先切读，再切写。
4. 写路径切流前，确认服务端幂等和结果查询都可用。
5. 全程保留 kill switch，直到两周并行窗口结束且指标稳定。

如果你要，我下一步可以把这份方案继续收敛成两种更具体的交付物之一：

1. 面向工程实施的前端改造清单  
2. 面向评审会的风险/灰度/回滚决策表