结论：不要机械地把 900 行分别搬进 `components/`、`hooks/`、`services/`、`utils/`。应按“谁拥有状态、异步策略和资源释放”拆成草稿、优惠券、库存、支付会话、最终提交五个能力；价格规则保持纯函数，`CheckoutPage` 只负责组合。

工作区实际只有 `.frontend-architect` 和空的 Git 提交，没有 `package.json`、`features/checkout` 或 `CheckoutPage.tsx`。因此以下是可执行的目标设计，但无法据此修改代码、确认现有 API 名称或运行测试。

## 建议结构

```text
features/checkout/
├── index.ts
├── CheckoutPage.tsx
├── model/
│   ├── checkout.ts
│   └── pricing.ts
├── draft/
│   └── useCheckoutDraft.ts
├── coupon/
│   ├── useCoupon.ts
│   └── couponAdapter.ts
├── inventory/
│   ├── useInventoryAvailability.ts
│   └── inventoryAdapter.ts
├── payment/
│   ├── usePaymentSession.ts
│   └── paymentAdapter.ts
├── submission/
│   ├── useCheckoutSubmission.ts
│   └── checkoutAdapter.ts
└── components/
    ├── CheckoutForm.tsx
    ├── CouponField.tsx
    ├── InventoryNotice.tsx
    ├── PaymentSection.tsx
    ├── OrderSummary.tsx
    └── CheckoutFeedback.tsx
```

这些目录不是必须一次建齐。若某个能力只有一个短文件且没有独立生命周期，就先将它放在 `features/checkout/` 下；等它确实形成两个以上有意义的单元再建目录。

不要建立泛化的 `utils.ts` 或 `services.ts`。价格规则叫 `pricing.ts`，优惠券传输适配叫 `couponAdapter.ts`，名称直接说明准入范围。

## 公开 API

功能对外原则上只公开：

```ts
export { CheckoutPage } from './CheckoutPage';
export type { CheckoutPageProps } from './CheckoutPage';
```

只有路由或其他真实消费者需要的类型才从 `index.ts` 导出。以下内容都应保持内部：

- 草稿 reducer、字段状态和 revision
- 优惠券请求状态及请求序号
- 库存订阅句柄
- 支付 SDK 实例、client secret、挂载容器细节
- 提交 operation ID、AbortController、重试快照
- adapter 的原始响应类型

若现有调用方直接导入 `CheckoutPage.tsx`，重构时先保留原路径或兼容导出，不能仅为了目录美观破坏路由契约。

## 状态与副作用所有权

| 能力 | 拥有的状态 | 拥有的副作用与策略 | 对外提供 |
|---|---|---|---|
| `useCheckoutDraft` | 可编辑字段、touched/dirty、同步验证、编辑 revision | 如已有草稿恢复机制，由这里负责读写和清理 | `draft`、字段错误、字段更新命令、`validate()`、稳定快照 |
| `pricing.ts` | 无 | 无 | `calculateQuote(input): CheckoutQuote`、相关纯 selector |
| `useCoupon` | 当前已应用优惠券，以及 `idle/checking/applied/rejected` 状态 | 请求、取消、旧响应抑制、移除和重新校验 | `coupon`、`status`、`apply(code)`、`remove()` |
| `useInventoryAvailability` | 最新库存快照及连接状态 | 按完整商品/规格身份订阅、换键、退订、忽略释放后的回调 | 可售状态、阻塞原因、必要时的重连命令 |
| `usePaymentSession` | SDK 会话的 `idle/initializing/ready/failed/disposed` 状态 | SDK 初始化、挂载、替换、卸载和回调失效 | SDK 无关的 `authorize/confirm` 命令与展示状态 |
| `useCheckoutSubmission` | `idle/submitting/succeeded/failed/unknown`，提交时输入快照 | 防重复提交、执行顺序、服务端调用、结果发布、结果不确定时的协调 | `submit(snapshot)`、`retry()`、提交状态和表单级错误 |
| `CheckoutPage` | 原则上不复制上述状态 | 组合能力、把输出传给 UI、生成提交快照 | 页面 JSX |

关键约束：

- `quote`、`canSubmit`、按钮文案等能够从现有状态推出的值不另存为 state。
- 优惠券输入文字可以属于草稿或 `CouponField` 的局部状态，但“已被服务端接受的优惠券”只属于 `useCoupon`，不能用同一个字符串表示。
- client 价格若只是预估，应明确标为展示值；最终金额以现有服务端契约为准。若服务器本来就返回权威 quote，则不要复制一套客户端业务算法，应改成 quote adapter 与纯展示 selector。
- 支付凭证和 SDK 私有对象不进入通用表单 state，也不向组件树广泛传播。
- 提交开始时捕获不可变快照。用户随后继续编辑草稿时，旧提交和重试仍对应原快照。
- 支付是有副作用写入，不能套用“最后一次请求胜出”。本地防双击只解决单页面重复触发；只有服务端明确支持幂等键或状态查询时，才能安全自动重试结果不明的支付。
- 优惠券检查适合 latest-wins：A 后发 B，B 成功后，A 的成功、失败或 `finally` 都不能覆盖 B。
- 错误在能恢复的位置呈现：字段错误归草稿、优惠券拒绝归优惠券区域、SDK 错误归支付区域、库存失效归库存提示、跨步骤提交失败归页面反馈。不要每层都 toast 或 catch 后返回空成功值。

## 内部 API 形状

以下表达契约，不要求照搬命名：

```ts
type CouponState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'applied'; coupon: AppliedCoupon }
  | { status: 'rejected'; error: CouponError };

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'succeeded'; orderId: string }
  | { status: 'failed'; error: CheckoutError; retryable: boolean }
  | { status: 'unknown'; recoveryMessage: string };

type CheckoutSubmission = {
  state: SubmissionState;
  submit(snapshot: CheckoutSnapshot): Promise<void>;
  retry(): Promise<void>;
};
```

请求序号、取消控制器、SDK 实例等不应出现在这些返回值里。调用方需要的是能力和结果，不是实现机械装置。

`CheckoutPage` 的组合路径应接近：

```text
取得购物车/路由输入
  -> 创建草稿能力
  -> 创建优惠券、库存、支付能力
  -> 纯计算 quote 与 canSubmit
  -> 将稳定快照交给提交能力
  -> 渲染语义组件
```

不要再加一个巨型 `useCheckout()`，把五类状态复制到新的聚合 store 中。页面可以协调，但不能重新拥有各能力的状态、竞态和 cleanup。

## 依赖方向

```text
index.ts
  -> CheckoutPage
      -> components
      -> draft/coupon/inventory/payment/submission
      -> model

components
  -> model 类型和显式 callbacks

draft/coupon/inventory/payment/submission
  -> model
  -> 各自 adapter

adapters
  -> 项目已有 HTTP client、订阅设施或第三方 SDK

model
  -> 不依赖 React、网络、浏览器全局或支付 SDK
```

补充规则：

- adapter 负责外部响应映射、运行时校验和 SDK 差异，不决定提示文案与页面布局。
- UI 不解析 HTTP 响应，也不识别支付 SDK 错误码。
- 内部模块使用直接相对导入，不绕经 feature 的公共 barrel，避免隐藏循环依赖。
- 不为了测试机械引入 repository、依赖注入容器或每个 adapter 一套 interface；只有确实存在替换边界或复杂外部协议时才定义 focused port。

## 组件边界

值得抽出的组件应至少拥有语义、交互或可访问性责任：

- `CheckoutForm`：`<form>` 语义、提交事件和字段级反馈。
- `CouponField`：优惠券输入、应用/移除操作及其局部反馈。
- `PaymentSection`：SDK 挂载区域、支付方式交互和支付错误关联。
- `OrderSummary`：只消费规范化后的 quote，不重新计算价格。
- `CheckoutFeedback`：提交中、失败、未知结果和成功后的页面级反馈。
- `InventoryNotice`：库存变化及阻塞原因。

收货地址字段、联系人字段等只有在它们拥有独立验证、交互或可访问性行为时才继续拆。仅包一层 `<div>` 并转发十几个 props 的组件应留在其父组件中。

## 测试放置

测试优先与所有者共置，沿用项目既有测试命名和 runner；不另建一套测试体系。

- `model/pricing.test.ts`
  - 用现有行为建立特征测试。
  - 覆盖舍入、折扣顺序、运费/税费边界等真实规则。
  - 不测试 `useMemo` 或私有辅助函数。

- `coupon/useCoupon.test.ts`
  - A 请求后 B 请求，B 成功后 A 的成功、失败、cleanup 均不能改变当前状态。
  - 移除、重新应用以及草稿变化引发的失效规则。

- `inventory/useInventoryAvailability.test.ts`
  - 商品身份变化时退订旧订阅。
  - 卸载后旧回调不能发布状态。
  - 旧 cleanup 不能关闭新实例或共享连接。

- `payment/usePaymentSession.test.ts`
  - 初始化失败、替换会话、重复 cleanup。
  - dispose 后 SDK 回调失效。
  - 测试公开状态与释放结果，不暴露私有 SDK 引用来迁就测试。

- `submission/useCheckoutSubmission.test.ts`
  - 双击只产生一次本地提交。
  - 提交使用捕获的快照，后续草稿编辑不篡改它。
  - 明确失败与结果未知采用不同恢复路径。
  - 重试仍使用原失败快照。
  - 用可控 Promise 制造竞态，不使用任意 `sleep`。

- `components/*.test.tsx`
  - 标签、错误关联、键盘提交、pending/disabled 行为。
  - 提交失败后的焦点或错误摘要行为。
  - 不以大面积 snapshot 代替交互断言。

- `CheckoutPage.test.tsx`
  - 保留少量跨边界集成测试：成功结算、优惠券导致报价变化、库存失效阻止提交、支付失败后的恢复。
  - adapter 若有非平凡协议映射，再增加契约测试。

## 推荐迁移顺序

1. 先为当前页面的关键可观察行为补特征测试，特别是金额、重复提交和错误呈现。
2. 提取纯 `pricing` 和 selector；页面继续使用原调用方式。
3. 分别隔离现有 coupon、inventory、payment、checkout 外部调用，但保持请求顺序不变。
4. 一次迁移一个有生命周期的 hook，并补对应竞态或 cleanup 测试。
5. 最后提取有语义的组件，让页面只留下组合代码。
6. 删除已经失去消费者的 loading flag、旧 effect、请求计数器和转发参数，避免同时保留两套所有权。

## 停止继续拆分的条件

满足以下条件就应停止，即使 `CheckoutPage` 或某个 hook 仍然不短：

- 每个业务事实只有一个状态所有者。
- 每个订阅或 SDK 资源都有明确的获取、替换、释放者。
- 普通变更有明显起点，不需要先搜索多个泛化目录。
- 页面只组合能力，没有复制它们的状态或竞态策略。
- 纯规则不依赖 React 和外部系统。
- 外部响应形状或 SDK 对象没有泄漏到 UI。
- 公共 API 明显小于内部实现面。
- 删除任一现有边界都会让生命周期、规则归属或变更定位变差。

反过来，出现以下情况就不要再拆：

- 新文件只能叫 `utils`、`helpers`、`manager`。
- 文件只包含一个仅由单一所有者使用的短私有函数。
- 新组件只是转发 props，没有语义、交互或可访问性责任。
- 新 hook 只是为了把 `useEffect` 从页面挪走，却没有独立能力契约。
- 需要大量 barrel、interface 或配置才能把刚拆开的模块重新连起来。
- 一项普通修改被迫同时穿过多个同级模块，说明原本原子性的流程被拆散了。

用两个现实变化检验这套边界：替换支付 SDK 应主要落在 `paymentAdapter`/`usePaymentSession`，优惠券接口响应变形应主要落在 `couponAdapter`；若两者仍要求改动页面和多个展示组件，说明边界仍在泄漏。以上划分遵循了本地 Frontend Architect Skill 中“按所有权、生命周期和变化原因拆分，而非按行数拆分”的指导；工作区未作任何修改。