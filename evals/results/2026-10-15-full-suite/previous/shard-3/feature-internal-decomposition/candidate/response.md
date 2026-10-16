结论：不要把 `CheckoutPage.tsx` 机械搬进四个全局式的 `components/hooks/services/utils` 桶。应继续保留 `features/checkout` 这一业务边界，并按“表单、优惠券、库存、支付、提交”这些各自拥有状态或生命周期的能力划分；价格计算作为纯领域规则，页面只负责装配。

当前工作区实际没有 React 源码或 `CheckoutPage.tsx`，Git 树也是空的，只有评估用 `.frontend-architect`。因此下面是基于请求中明确列出的职责给出的目标结构，具体类型名、接口字段和现有数据层接入方式仍需以真实仓库为准；没有虚构项目已有依赖，也没有修改文件。

## 建议结构

```text
features/checkout/
  index.ts
  CheckoutPage.tsx

  model/
    checkoutTypes.ts
    pricing.ts
    pricing.test.ts

  form/
    useCheckoutDraft.ts
    checkoutValidation.ts
    CheckoutForm.tsx

  coupon/
    useCoupon.ts
    couponApi.ts
    CouponField.tsx

  inventory/
    useInventoryAvailability.ts
    inventorySource.ts

  payment/
    usePaymentSession.ts
    paymentSdkAdapter.ts
    PaymentSection.tsx

  submission/
    useCheckoutSubmission.ts
    checkoutApi.ts

  ui/
    OrderSummary.tsx
    CheckoutActions.tsx
```

这不是要求一次创建完整目录树：

- 某个能力当前只有一个文件时，可以先放在 feature 根目录。
- `InventoryNotice`、`CheckoutFeedback` 等展示组件只有在确实拥有独立交互、无障碍或错误呈现策略时才提取。
- 不建立笼统的 `utils.ts`、`services.ts`、`types.ts` 或一个包办全部状态的 `useCheckout()`。
- `couponApi.ts`、`checkoutApi.ts` 如果只是给现有请求库改名转发，则不必单独存在；只有在负责响应映射、错误归一化或请求策略时才构成边界。

## 职责与所有权

| 模块 | 拥有什么 | 不应拥有 |
|---|---|---|
| `CheckoutPage` | 能力装配、把当前输出传给 UI、组织提交顺序 | 各能力的内部状态、请求标识、SDK 实例、订阅清理 |
| `useCheckoutDraft` | 可编辑草稿、字段 touched/dirty、客户端校验、字段更新 | 价格副本、库存副本、支付状态、最终提交状态 |
| `pricing` | 纯价格与优惠规则、舍入和汇总结果 | React 状态、网络请求、格式化 JSX、SDK |
| `useCoupon` | 已应用优惠券、申请中的请求、失败、竞态策略 | 整份 checkout 草稿、最终价格的另一份可写状态 |
| `useInventoryAvailability` | 当前库存快照、订阅身份、重订阅和清理 | 表单字段、提交按钮状态、通知文案 |
| `usePaymentSession` | SDK 加载/初始化/挂载/确认能力、实例替换和释放 | 订单提交请求、页面级错误汇总 |
| `useCheckoutSubmission` | 一次提交的稳定快照、重复提交策略、提交结果与恢复 | 长期表单编辑、SDK DOM 生命周期、库存订阅 |
| UI 组件 | 语义化渲染、局部输入交互、焦点和无障碍反馈 | 解析 API 响应、直接调用 SDK、复制业务状态 |

关键状态规则：

- 价格、折扣和总价应从草稿、已接受优惠券以及必要领域事实中派生，不再保存一套可写的 `total`、`discount` 状态。
- 优惠券输入框里尚未提交的文字可以是组件局部状态；“正在验证/已接受/被拒绝”属于优惠券能力。
- 库存以订阅所有者的快照为准，不同步复制进表单草稿。
- SDK 实例放在支付 hook 的 `ref` 或其内部资源对象中，不进入 React 可渲染状态；UI 只读取 `status/error` 等投影。
- 提交时生成不可变快照。之后用户继续编辑草稿，不应改变已经发出的那一次提交或其重试含义。
- 错误由能恢复或翻译它的模块捕获。页面可以决定错误显示位置和优先级，但不把所有错误重新复制进一个 `checkoutError` 状态。

## API 设计

Feature 对外默认只暴露路由真正需要的入口：

```ts
export { CheckoutPage } from './CheckoutPage'
export type { CheckoutPageProps } from './CheckoutPage'
```

如果页面没有外部 props，则连 `CheckoutPageProps` 也不导出。`pricing`、hooks、SDK adapter 和内部组件不从 `index.ts` 暴露，外部消费者不得深路径导入。

内部 API 应面向能力，而不是暴露实现机械结构：

```ts
calculateCheckoutSummary(input): CheckoutSummary
```

这是纯函数。输入是明确的领域事实，不接受整个页面 store，也不访问网络或浏览器环境。

```ts
useCheckoutDraft(initialDraft): {
  draft
  fieldErrors
  updateField
  validate
}
```

应优先沿用项目已有 form library；如果已有表单控制器，这一层可能只是领域校验和字段映射，而不应再造表单框架。

```ts
useCoupon(): {
  state
  apply(code, eligibilityInput)
  remove()
  retry()
}
```

`state` 宜表达互斥状态，例如 `idle/applying/applied/rejected`，而不是可能矛盾的多个布尔值。`retry` 使用上一次失败时的输入，不能悄悄读取后来变化的草稿。

```ts
useInventoryAvailability(itemIdentities): {
  availability
  status
  error
}
```

只接受订阅所需的稳定身份，不接受整个 checkout 对象。

```ts
usePaymentSession(existingSdkOptions): {
  mountRef
  status
  error
  confirm
}
```

具体命名服从 SDK 现有契约。`confirm` 是能力，不应暴露原始 SDK 实例给页面。

```ts
useCheckoutSubmission({ placeOrder, confirmPayment }): {
  state
  submit(snapshot)
}
```

这里可以传函数能力，不必为测试专门创建 repository/interface/class。若项目已有 mutation/query 层，应直接复用其取消、缓存和错误约定。

## 异步与生命周期政策

不同操作不能统一套用一种竞态处理：

- 优惠券校验通常是“只发布最新结果”。即使取消旧请求，也仍需请求身份检查，确保旧请求的成功、失败和 `finally` 都不能覆盖新状态。
- 库存订阅由 `useInventoryAvailability` 获取并释放。输入身份变化时先使旧订阅失效；旧回调不能更新新商品集合的状态。
- 支付 SDK 由 `usePaymentSession` 完整拥有“创建—挂载—替换—销毁”。旧 effect 的 cleanup 只能释放自己创建的实例，不能误销毁后续实例。
- 最终提交是写操作，不采用简单的 latest-wins。提交期间应本地禁用或拒绝重复触发；如果服务端已有幂等键，复用它。仅禁用按钮不能解决网络重试、多标签页或多客户端重复写入。
- 写请求超时不等于失败。如果服务端契约不能证明安全重试，应保留“结果未知/需要核对”的诚实状态，而不是自动再次扣款或创建订单。
- 页面卸载或支付会话被替换后，旧回调不得再发布当前错误或成功状态。

优惠券有效性依赖哪些草稿字段，以及这些字段变化后是清除、保留还是重新校验，属于必须从现有行为确认的产品契约。重构时应显式保留该策略，不能借拆文件顺手改变。

## 内部依赖方向

```text
index
  -> CheckoutPage
       -> UI components
       -> form / coupon / inventory / payment / submission
       -> model

UI components
  -> model types
  -> 通过 props 接收值和命令

form / coupon / inventory / payment / submission
  -> model
  -> 各自的外部 adapter

external adapters
  -> 项目已有 HTTP client、订阅设施或第三方 SDK

model
  -> 不依赖 React、UI、网络、浏览器 API 或 SDK
```

具体约束：

- `pricing.ts` 不得导入 hooks、组件或 API。
- adapter 不决定 toast、文案或页面跳转。
- UI 不解析 transport DTO，也不直接读取 SDK 实例。
- 各能力之间不要互相导入 hook。需要协调时由 `CheckoutPage` 或提交 workflow 接线。
- feature 内部采用直接相对导入，不通过 `index.ts` 绕一圈，以免隐藏循环依赖。

`CheckoutPage` 最终应能按执行顺序读懂：读取各能力输出、计算 summary、生成提交快照、渲染 UI。它可以有协调逻辑，但不重新保存各 hook 已经拥有的状态。

## 错误展示

建议保持错误来源，而不是建立一个万能错误数组：

- 字段错误：由表单模块返回，并在对应字段附近呈现。
- 优惠券拒绝：由优惠券模块返回，在优惠券入口附近呈现。
- 库存变化：由库存模块提供领域状态，展示位置由相关 UI 决定。
- 支付初始化或确认错误：支付模块将 SDK 错误归一化后返回。
- 最终提交错误：提交模块区分可重试拒绝、未知结果及意外失败。
- 页面级 alert 只负责可访问地展示和聚焦，不重新定义错误含义。

同一个失败只应由一个层级负责通知，避免 hook toast 一次、页面再 toast 一次。

## 测试放置

测试靠近行为所有者，而不是集中建立一套按技术角色分类的测试目录。

- `model/pricing.test.ts`
  - 优惠适用与不适用。
  - 舍入、零值、边界金额。
  - 规则顺序。
  - 只测试真实业务规则，不测试简单加法或私有函数。

- `coupon/useCoupon.test.tsx`
  - A 请求后发起 B，B 成功后 A 的成功、失败和 cleanup 都不能覆盖 B。
  - retry 使用失败时的输入。
  - eligibility 输入变化遵守既定的清除或重验策略。

- `inventory/useInventoryAvailability.test.tsx`
  - 身份变化时释放旧订阅并建立新订阅。
  - 卸载后不再发布状态。
  - 旧订阅回调不能污染新快照。

- `payment/usePaymentSession.test.tsx`
  - 初始化、挂载、替换、卸载的资源对应关系。
  - 部分初始化失败时已获得的资源被释放。
  - 只有 ready 状态可以确认支付。
  - 使用 adapter fake，不把测试绑死在 SDK 私有实现上。

- `submission/useCheckoutSubmission.test.tsx`
  - 快速双击只触发允许的一次写操作。
  - 提交使用点击时快照。
  - 成功、明确失败和未知结果不会互相伪装。
  - 页面卸载或会话替换后旧完成不会发布。

- `CheckoutPage.test.tsx`
  - 验证失败不会进入支付/下单。
  - 优惠券结果反映在订单摘要。
  - 库存变化影响既定的可提交行为。
  - 支付或下单失败提供正确恢复入口。
  - 测试用户可见行为，不断言内部 hook 调用次数来证明架构正确。

支付 SDK 真正挂载、浏览器焦点和订阅清理若依赖真实 DOM/SDK，应另外保留一条浏览器或 SDK sandbox 集成测试；单元 fake 不能证明真实集成成功。

## 推荐迁移顺序

1. 先为现有竞态、重复提交和 SDK cleanup 补特征测试，锁定可观察行为。
2. 提取 `pricing` 等纯规则，页面仍调用原有请求和 SDK。
3. 逐个提取优惠券、库存、支付生命周期；每完成一个就验证原页面。
4. 提取提交 workflow，明确稳定快照和重复提交政策。
5. 最后按交互责任提取 UI 组件。
6. 删除原页面中已迁移的状态、effect、旧 handler 和补偿逻辑，避免双重所有权。

这样每一步都可独立审查，也不会同时改变结构和行为。

## 停止继续拆分的条件

满足以下条件后就应停止，而不是继续追求更多文件：

- 每一份可写状态和外部资源都有唯一、明确的所有者。
- 页面只协调能力，不复制能力内部状态。
- 价格规则能独立于 React 和 I/O 测试。
- 外部响应、SDK 与订阅细节没有泄漏进 UI。
- 普通变更有明显入口，且不会跨多个无关技术目录。
- 删除任一现有边界都会重新混合生命周期、错误策略或业务规则。
- 剩余 helper 只服务一个所有者，与其一起变化，提取后反而增加跳转。
- 新文件若只能叫 `utils`、`manager`、`common`，或只是参数原样转发，就不再提取。
- 不为每个 JSX 块、每个类型或每个单函数建立目录和 barrel。

用三个现实变化校验即可：

- 更换支付 SDK：应主要修改 `paymentSdkAdapter`、支付生命周期及其测试，表单和价格规则稳定。
- 修改优惠计算规则：应落在 `pricing` 及其测试，支付和库存模块稳定。
- 改变库存订阅协议：应落在 `inventorySource` 和订阅 hook，订单摘要只消费不变的领域结果。

如果这些变化仍会迫使维护者进入多个不相关模块，边界还在泄漏；如果进一步拆分只产生转发文件，当前粒度已经足够。

本次按本地 Skill 的职责所有权、依赖方向和生命周期原则收敛了方案；`.frontend-architect` 保持未改动。由于仓库没有应用源码或测试配置，未执行代码修改、构建或测试。