当前工作区没有可检查的前端源码。`/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-feature-internal-decomposition-baseline-nkroige2` 里只有 `.git`，`git ls-tree -r HEAD` 也为空，所以我无法基于真实的 `features/checkout/CheckoutPage.tsx`、现有依赖或调用方式做“按现状”的拆分判断。

在这个前提下，只能给你一个以你描述的职责为边界的目标拆分方案，供团队对照真实实现裁剪，而不是声称这就是仓库现状。

**建议的内部模块划分**
`CheckoutPage` 应保留为编排层，只做路由入口、装配子模块、渲染页面级骨架，不再拥有业务算法或外部资源生命周期。

建议按“状态所有权 + 副作用边界”拆，而不是按语法类别机械拆：

1. `features/checkout/model/useCheckoutDraft`
   公开 API:
   - `fields`
   - `updateField(name, value)`
   - `hydrate(initialDraft)`
   - `resetDraft()`
   - `isDirty`
   
   所有权:
   - 收货地址、联系方式、配送方式、发票等用户可编辑草稿
   - 草稿校验前的原始输入状态
   
   不负责:
   - 价格计算
   - 提交
   - SDK
   - 网络请求以外的持久化策略判断

2. `features/checkout/model/useCheckoutPricing`
   公开 API:
   - `pricing`
   - `applyCouponPreview(code)`
   - `removeCoupon()`
   - `refreshPricing(input)`
   
   所有权:
   - 小计、运费、税、优惠、应付金额
   - “草稿 + 购物车 + 优惠券”到价格视图模型的派生
   
   依赖:
   - 纯计算函数放 `pricing/utils`
   - 服务请求放 `pricing/service`
   
   原则:
   - 能纯算的先纯算，服务端确认结果再覆盖

3. `features/checkout/model/useCoupon`
   公开 API:
   - `couponCode`
   - `setCouponCode`
   - `applyCoupon()`
   - `removeCoupon()`
   - `status`
   - `error`
   
   所有权:
   - 优惠券输入与请求状态机
   - 防重复提交、过期响应丢弃
   
   不直接持有:
   - 总价最终真值
   说明:
   - 优惠券模块输出“已应用优惠上下文”，由 `useCheckoutPricing` 消费

4. `features/checkout/model/useInventorySubscription`
   公开 API:
   - `availability`
   - `isRefreshing`
   - `subscribe(items)`
   - `unsubscribe()`
   
   所有权:
   - 库存订阅建立/销毁
   - 实时库存更新映射
   
   依赖方向:
   - 只向页面报告“库存快照/变更”
   - 不直接改表单、不直接触发支付

5. `features/checkout/model/usePaymentSession`
   公开 API:
   - `paymentMethods`
   - `selectedMethod`
   - `selectMethod`
   - `sdkReady`
   - `confirmPayment(payload)`
   - `teardown()`
   
   所有权:
   - 支付 SDK 初始化、更新、销毁
   - payment intent / client token / method capability 之类的支付会话态
   
   原则:
   - SDK 生命周期必须集中在一个 hook/service，不要散落到表单组件
   - UI 只消费 readiness 和 action，不碰 SDK 实例细节

6. `features/checkout/model/useCheckoutSubmit`
   公开 API:
   - `submit()`
   - `isSubmitting`
   - `submitError`
   - `canSubmit`
   
   所有权:
   - 最终提交编排
   - 并发控制、幂等、防双击、过期结果丢弃
   - 调用顺序：校验 -> 价格确认 -> 库存确认 -> 支付确认 -> 订单提交
   
   不负责:
   - 表单字段细节
   - JSX 呈现

7. `features/checkout/model/useCheckoutNotifications`
   公开 API:
   - `messages`
   - `pushError`
   - `pushWarning`
   - `clearMessage`
   
   所有权:
   - 页面级错误/提示聚合
   说明:
   - 不要让每个 hook 自己弹 toast；各 hook 返回结构化错误，由页面统一决定展示

**组件层建议**
组件只按视图块拆，不承载跨块业务：

- `components/CheckoutFormSection`
- `components/ShippingSection`
- `components/PaymentSection`
- `components/OrderSummary`
- `components/CouponField`
- `components/InventoryWarning`
- `components/SubmitBar`

这些组件的公开 API 应是“值 + 回调 + 展示状态”，不要把 service 或 SDK 实例透传进组件。

**services / utils 边界**
`services` 负责外部 I/O，`utils` 负责纯逻辑。

- `services/checkoutApi`
  - `fetchPricing`
  - `submitOrder`
  - `validateCheckout`
- `services/couponApi`
  - `applyCoupon`
  - `removeCoupon`
- `services/inventoryChannel`
  - `subscribeInventory`
  - `unsubscribeInventory`
- `services/paymentGateway`
  - `createPaymentSession`
  - `mountSdk`
  - `confirmPayment`
  - `destroySdk`

- `utils/pricing`
  - 金额归并、折扣分摊、展示格式转换
- `utils/checkoutErrors`
  - 服务错误到 UI 错误模型映射
- `utils/checkoutGuards`
  - 提交前条件判断、状态断言
- `utils/checkoutMappers`
  - API DTO <-> 页面模型

依赖方向应保持单向：
`components` -> `model hooks` -> `services/utils`
`services` 不反向依赖 React
`utils` 不依赖 React 和网络层

**状态与副作用所有权**
建议把真值分成四类，避免重复持有：

- 用户输入真值：`useCheckoutDraft`
- 远端资源真值：各 `service` 返回，经对应 hook 持有
- 派生真值：`useCheckoutPricing` 内部计算
- 页面展示真值：`CheckoutPage` 汇总各 hook 输出后决定展示

副作用归属：
- 网络请求：对应业务 hook 内部调用 service
- SDK 生命周期：`usePaymentSession`
- 实时订阅：`useInventorySubscription`
- 页面级错误展示：页面或 `useCheckoutNotifications`
- 提交竞态控制：只允许 `useCheckoutSubmit` 持有

**测试放置**
按职责放，不按目录平均分：

- `utils/*.test.ts`
  - 价格计算
  - 错误映射
  - guard 条件
- `services/*.test.ts`
  - API 契约、请求参数、异常分支
- `model/*.test.tsx`
  - hook 状态机、竞态、取消、过期响应处理
- `components/*.test.tsx`
  - 渲染与交互，不测业务算法
- `CheckoutPage.integration.test.tsx`
  - 关键主流程：加载、改地址、用券、库存变更、支付、提交失败重试

重点补的不是“每个文件一个测试”，而是这些高风险行为：
- 优惠券请求后返回顺序乱掉
- 提交时价格/库存已变化
- SDK 初始化后草稿变化导致会话失效
- 双击提交或返回过慢造成重复下单
- 局部错误把整页状态打坏

**停止继续拆分的条件**
到这里就该停，不要继续碎片化：

- 一个模块只拥有一种业务真值和一种主要副作用
- 页面编排时不需要跨 3 个以上模块来完成一个简单字段更新
- 组件 props 基本是领域概念，不是十几个低层布尔值
- 新增一个支付方式或一个优惠规则时，改动集中在单一业务模块
- 单元测试可以在不挂整页的情况下覆盖主要状态机

反过来说，如果拆完后出现这些信号，说明过度了：
- hook 之间互相调用形成网状依赖
- 一个用户动作要穿过 `component -> hook A -> hook B -> service C -> util D`
- 为了复用而提炼出只有一个调用点的薄封装
- 页面只是把几十个碎 props 往下传，复杂度没有实质下降

如果你把真实的 `CheckoutPage.tsx` 和 `features/checkout` 目录放进工作区，我可以基于实际代码再给一版“按现状落地”的模块图、依赖方向和迁移顺序。