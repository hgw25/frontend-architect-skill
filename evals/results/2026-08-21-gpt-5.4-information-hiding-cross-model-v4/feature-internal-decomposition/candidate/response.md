当前工作区里没有实际的 `features/checkout` 源码可检视，只有本地 Skill 和参考文件；因此下面不是对现有实现的逐文件评审，而是基于你描述的职责分布，给出一个可执行的 `features/checkout` 内部拆分方案。核心判断是：不要机械按 `components/hooks/services/utils` 平铺，而是按“谁拥有哪类状态、谁负责哪种外部副作用”来分。

**建议边界**

保留 `features/checkout` 作为 feature 边界，内部优先按责任分层，而不是先按技术名词分桶：

```text
features/checkout/
  index.ts
  page/
    CheckoutPage.tsx
    CheckoutPage.test.tsx
  flow/
    useCheckoutFlow.ts
    submitOrder.ts
    submitOrder.test.ts
  form/
    checkoutDraft.ts
    useCheckoutDraft.ts
    draftValidation.ts
    useCheckoutDraft.test.ts
  pricing/
    pricingModel.ts
    promotionModel.ts
    pricingModel.test.ts
  coupon/
    useCouponRedemption.ts
    couponApi.ts
    couponApi.test.ts
  inventory/
    useInventoryAvailability.ts
    inventoryGateway.ts
    inventoryGateway.test.ts
  payment/
    usePaymentSession.ts
    paymentSdkAdapter.ts
    paymentSdkAdapter.test.ts
  ui/
    CheckoutForm.tsx
    OrderSummary.tsx
    PaymentSection.tsx
    CouponField.tsx
    CheckoutAlerts.tsx
```

这里的重点不是目录名本身，而是这几个独立能力各自拥有不同的生命周期：

- `form/` 只拥有用户可编辑草稿、校验、字段错误映射。
- `pricing/` 只拥有纯计算规则，不拥有请求、订阅、SDK。
- `coupon/` 只拥有优惠券请求及其并发/过期策略。
- `inventory/` 只拥有库存订阅与取消订阅。
- `payment/` 只拥有支付 SDK 的初始化、更新、销毁。
- `flow/` 只负责结算流程编排，不能重新“接管”上面各模块的内部状态。

**公开 API 与所有权**

建议把 `CheckoutPage.tsx` 降为组合层，只做装配：

```ts
function CheckoutPage(): JSX.Element
```

它依赖一个 feature-level coordinator，例如：

```ts
function useCheckoutFlow(): {
  form: CheckoutDraftController
  pricing: PricingViewModel
  coupon: CouponController
  inventory: InventoryController
  payment: PaymentController
  submit: {
    run(): Promise<void>
    status: 'idle' | 'submitting' | 'error'
    error: string | null
    canSubmit: boolean
  }
}
```

但这个 `useCheckoutFlow` 只是编排器，不应成为“超级 hook”。它的职责是：

- 读取 `form` 草稿并喂给 `pricing`
- 结合 `inventory` / `payment` 状态生成 `canSubmit`
- 在 `submit.run()` 时按顺序调用提交逻辑
- 决定页面级错误提示和页面级 loading

每个子模块的公开 API 要尽量窄：

`useCheckoutDraft()`
- 状态：`values`、`dirty`、`fieldErrors`
- 命令：`updateField`、`replaceFromServer`、`validate`
- 不负责价格计算、优惠券请求、支付 SDK

`pricingModel.ts`
- API：`buildPricing(input): PricingResult`
- 纯函数，只吃草稿、库存快照、优惠信息
- 不读 React 状态，不发请求

`useCouponRedemption()`
- 状态：`status`、`appliedCoupon`、`error`
- 命令：`apply(code)`、`remove()`
- 内部拥有请求取消、只认最后一次请求、防重复提交
- 不直接改表单，不直接控制 summary JSX

`useInventoryAvailability()`
- 状态：`availability`、`isStale`、`error`
- 命令：通常无需公开很多，最多 `refresh`
- 内部拥有订阅建立/清理、重连策略
- 不负责弹 toast，不负责禁用按钮文案

`usePaymentSession()`
- 状态：`status`、`paymentMethodState`、`error`
- 命令：`mount(element)`、`confirm()`、`teardown()`
- 内部拥有 SDK 实例生命周期
- 适配器层负责把第三方 SDK shape 归一化

`submitOrder.ts`
- API：`submitOrder(input, deps): Promise<SubmitResult>`
- 这里集中处理幂等键、竞态保护、服务端错误归一化
- 不直接依赖 JSX；最好只依赖 ports / adapters

**依赖方向**

推荐保持单向依赖：

```text
page -> flow
flow -> form, pricing, coupon, inventory, payment
ui -> form, pricing, coupon, inventory, payment 暴露出的 view model / actions
coupon -> couponApi
inventory -> inventoryGateway
payment -> paymentSdkAdapter
pricing -> 无副作用依赖
```

约束是：

- `pricing/` 不能 import React、SDK、HTTP client。
- `coupon/`、`inventory/`、`payment/` 各自拥有自己的 effect 和 cleanup，不能互相调用。
- `ui/` 只消费 domain-relevant props，不解析 transport response。
- `flow/` 可以组合多个能力，但不能把它们的内部 state 再复制成第二份总状态。

换句话说，页面可以协调，但不要“重新拥有”优惠券请求状态、库存订阅状态、支付 SDK 状态。

**测试放置**

测试跟着所有者走，不跟技术类型走：

- `pricing/pricingModel.test.ts`
  保护价格、折扣、满减、券叠加规则这类纯业务计算。
- `coupon/useCouponRedemption.test.ts` 或 `coupon/couponApi.test.ts`
  保护最后一次请求生效、失败恢复、移除优惠券行为。
- `inventory/useInventoryAvailability.test.ts`
  保护订阅建立、更新、unmount 清理、stale 状态。
- `payment/usePaymentSession.test.ts`
  保护 SDK mount/unmount、重复初始化防护、confirm 前置条件。
- `flow/submitOrder.test.ts`
  保护提交竞态、重复点击、依赖未就绪禁止提交、错误归一化。
- `page/CheckoutPage.test.tsx`
  只测关键集成路径：用户填写、应用券、库存变化、支付就绪、提交成功/失败提示。

不要为“拆了一个 hook”就补结构镜像测试。测试应对准可观察失败。

**停止继续拆分的条件**

满足下面几点就应停止，而不是继续细化成更多 `utils` / `services`：

- 一个模块内部只围绕一个可命名能力变化，比如“优惠券兑换”或“支付会话”。
- 模块对外 API 明显比内部实现小，消费者不需要知道其竞态、清理、SDK 细节。
- 页面层只负责编排，不再直接持有多个彼此无关的 effect。
- 纯规则已经从副作用里分离，关键计算可单测。
- 再拆下去只会得到“转发包装层”、`types.ts`、`helpers.ts` 这类无明确所有权文件。

明确不建议：

- 先按 `components/hooks/services/utils` 做四大文件夹，再把所有 checkout 代码撒进去。
- 把所有逻辑塞进一个 `useCheckout()`，只是从 900 行组件变成 900 行 hook。
- 把每块 JSX 都拆成组件，但状态和副作用仍留在页面里。
- 创建泛化的 `checkoutService` 统一处理优惠券、库存、支付、提交，它们不是同一种外部系统。

如果你愿意，我下一步可以基于这个方案直接给出一版更落地的文件树和 TypeScript 接口草案，按“最低改动迁移顺序”展开。