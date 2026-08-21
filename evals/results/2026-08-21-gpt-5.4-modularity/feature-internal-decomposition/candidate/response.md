仓库里没有可检查的 `features/checkout` 源码；当前 workspace 只有 `.frontend-architect/` 和 `.git/`，不存在 `CheckoutPage.tsx` 或其他业务文件。所以我不能声称这是“基于现有实现细节”的拆分结论。基于你给出的已知职责，我会把它定为一个“单特性内的工作流拆分”，而不是机械分散到全局 `components/hooks/services/utils`。

最合适的边界是按责任拆成“组合层 + 工作流层 + 纯领域层 + 外部适配层 + UI 层”，依赖方向保持单向：

```text
features/checkout/
  index.ts
  page/
    CheckoutPage.tsx
  workflow/
    useCheckoutFlow.ts
    checkoutSubmission.ts
  model/
    checkoutDraft.ts
    pricing.ts
    coupon.ts
    availability.ts
    errors.ts
  adapters/
    couponApi.ts
    inventorySubscription.ts
    paymentSession.ts
  ui/
    CheckoutForm.tsx
    OrderSummary.tsx
    CouponField.tsx
    PaymentSection.tsx
    SubmitBar.tsx
    ErrorBanner.tsx
  __tests__/
```

核心决策如下。

1. `CheckoutPage.tsx` 只保留组合职责  
它公开的唯一职责是装配页面：拿到路由参数、调用 `useCheckoutFlow()`、把结果传给 `ui/*`。  
不要让它继续直接拥有：
- 价格/优惠计算
- coupon 请求
- 库存订阅
- payment SDK 初始化/销毁
- 提交竞态控制
- 错误归一化

公开 API 建议尽量窄：
```ts
export function CheckoutPage(): JSX.Element
```
页面不向外暴露内部 hook、adapter 或计算函数。

2. `workflow/useCheckoutFlow.ts` 是唯一的特性级状态 owner  
这个 hook 应该拥有“这个结算流程当前处于什么状态”，而不是让每个子组件各自记一份。它负责：
- 表单草稿状态与更新命令
- 组合 `pricing`/`coupon`/`availability` 的派生视图状态
- 触发 coupon apply/remove
- 驱动支付会话准备
- 提交时的去重、取消、忽略过期响应
- 汇总用户可见错误

建议公开 API 是一个面向页面的 view model，而不是暴露很多零碎 setter：
```ts
type CheckoutFlow = {
  draft: CheckoutDraft
  summary: OrderSummaryViewModel
  availability: AvailabilityState
  payment: PaymentViewModel
  submission: SubmissionState
  errors: CheckoutError[]
  actions: {
    updateField(input: DraftPatch): void
    applyCoupon(code: string): Promise<void>
    removeCoupon(): void
    submit(): Promise<void>
  }
}
```
如果提交流程状态很多，优先用 reducer 或判别联合，而不是一组会冲突的布尔值。

3. `model/*` 只放纯逻辑，绝不碰 React 和 I/O  
这是最应该拆出来的部分，因为它们有稳定语义：
- `checkoutDraft.ts`: draft 类型、默认值、同步校验、patch 合并规则
- `pricing.ts`: 小计、折扣、运费、税费、总价计算
- `coupon.ts`: coupon 领域结果的归一化，例如 `applied / invalid / expired / not_applicable`
- `availability.ts`: 库存状态合并规则，例如订阅数据怎样覆盖初始快照
- `errors.ts`: 不同 adapter 错误映射成统一 `CheckoutError`

这些模块公开纯函数，例如：
```ts
calculateOrderSummary(input: PricingInput): OrderSummary
validateDraft(draft: CheckoutDraft): ValidationResult
mapCouponResult(api: CouponResponse): CouponState
```
它们不依赖 UI、SDK、fetch client、toast。

4. `adapters/*` 专门隔离外部系统  
你描述的复杂度里，真正难维护的是外部生命周期，不是 JSX。对应拆分：
- `couponApi.ts`: 请求/响应映射、取消、错误分类
- `inventorySubscription.ts`: `subscribe/unsubscribe` 边界
- `paymentSession.ts`: payment SDK 的创建、更新、销毁、事件桥接

这里适合用闭包或小对象封装资源生命周期，尤其是 payment SDK：
```ts
type PaymentSession = {
  mount(element: HTMLElement): void
  update(input: PaymentSessionInput): Promise<void>
  dispose(): void
}
```
不要让 React 组件直接散落着 `sdk.init()`、`sdk.on()`、`sdk.destroy()`。

5. `ui/*` 只负责语义界面与局部交互  
组件要按“用户能理解的界面单元”拆，不按 JSX 视觉块机械拆。优先这些边界：
- `CheckoutForm`: 联系方式、地址、发票等字段集合
- `CouponField`: 输入、按钮、加载、失败提示
- `OrderSummary`: 展示价格结果
- `PaymentSection`: 支付容器和支付态反馈
- `SubmitBar`: 提交按钮、禁用原因、进行中状态
- `ErrorBanner`: 页面级错误

UI 组件的公开 API 应传领域值和命令，不传 transport 细节：
```ts
<CouponField
  value={couponCode}
  status={couponStatus}
  onApply={actions.applyCoupon}
  onRemove={actions.removeCoupon}
/>
```
不要让 UI 组件自己 import `couponApi` 或 `paymentSession`。

6. 状态与副作用所有权  
建议明确到这个粒度：
- 表单输入的瞬时值：`useCheckoutFlow`
- 纯派生价格：`model/pricing.ts` 计算，`useCheckoutFlow` 调用，不单独存 state，除非后端返回 authoritative quote
- coupon 网络请求状态：`useCheckoutFlow`
- 库存订阅生命周期：`useCheckoutFlow` 持有，`adapters/inventorySubscription` 执行
- payment SDK 生命周期：`useCheckoutFlow` 持有，`adapters/paymentSession` 执行
- 提交竞态与幂等保护：`workflow/checkoutSubmission.ts`
- toast/banner 文案映射：`model/errors.ts` 或 `workflow`，不要散在各按钮事件里

一个实用原则：凡是“同步外部系统”的逻辑都不进 `ui/*`；凡是“可由现有数据算出”的值都不升成独立 state。

7. 测试放置  
按拥有者 colocate，不按测试类型集中到全局目录。
- `model/*.test.ts`: 价格、优惠、校验、错误映射
- `adapters/*.test.ts`: SDK/订阅/fetch 的边界行为，用 mock 验证 cleanup、取消、错误分类
- `workflow/useCheckoutFlow.test.tsx`: 核心流程集成测试
- `page/CheckoutPage.test.tsx` 或 `__tests__/checkout-page.test.tsx`: 少量用户旅程测试

优先覆盖这些风险：
- coupon 请求乱序返回，旧结果不能覆盖新结果
- 库存更新到来后，summary/submit 可用性正确变化
- payment session 在金额或支付方式变更时正确 update/dispose
- 重复点击 submit 不会并发提交
- draft 校验失败与服务端失败的提示来源可区分

8. 停止继续拆分的条件  
满足下面几点就该停，不要为了“整齐”继续拆：
- 页面层已经只做装配，不再混入业务规则和外部副作用
- 每个新增模块都有单一、可命名的职责
- `ui` 不直接依赖 adapter，`model` 不依赖 React 或 I/O
- 普通结算改动通常只落在一个主 owner 上
- 新文件名代表真实概念，而不是 `utils`/`helpers`/`services` 杂物箱
- 再继续拆只会得到“转发 props 的空组件”或“把几个无关 effect 塞进一个 hook”

不建议的拆法也很明确：
- 顶层直接变成 `components/hooks/services/utils` 四散结构
- 把所有副作用塞进一个巨型 `useCheckout`，只是把 900 行从组件挪到 hook
- 为一次性逻辑建立 repository/facade/interface 层
- 因为 JSX 区块多，就把每块都拆成无状态子组件

如果你把真实 `features/checkout` 文件放进 workspace，我可以基于现有 imports、状态形状和副作用位置，把上面的职责图收敛成一版针对当前代码的具体模块清单和迁移顺序。