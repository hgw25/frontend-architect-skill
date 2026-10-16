结论：不要按 `components / hooks / services / utils` 四个技术抽屉机械搬运。应先按结算能力划分所有权，再在能力内部区分 UI、状态和外部适配器。

当前工作区没有 `CheckoutPage.tsx`、应用源码、依赖或测试配置，只有 `.frontend-architect` 指南，因此以下设计以请求中明确列出的职责为依据；具体类型名、请求库和测试框架应沿用真实项目契约，不能凭空替换。

## 建议结构

```text
features/checkout/
  index.ts
  CheckoutPage.tsx
  checkoutModel.ts
  pricing.ts
  pricing.test.ts

  form/
    CheckoutForm.tsx
    useCheckoutDraft.ts
    useCheckoutDraft.test.tsx

  coupon/
    CouponControl.tsx
    useCoupon.ts
    couponClient.ts
    useCoupon.test.tsx

  inventory/
    InventoryStatus.tsx
    useInventoryAvailability.ts
    inventorySubscription.ts
    useInventoryAvailability.test.tsx

  payment/
    PaymentSection.tsx
    usePaymentSession.ts
    paymentSdkAdapter.ts
    usePaymentSession.test.tsx

  submission/
    useCheckoutSubmission.ts
    checkoutClient.ts
    SubmissionError.tsx
    useCheckoutSubmission.test.tsx

  CheckoutPage.test.tsx
```

这是目标形态，不要求一次创建所有目录。某项能力如果目前只有一个短小实现，可以先与页面同级放置，等出现独立生命周期、测试或多个实现单元再建目录。

`checkoutModel.ts` 只放多个能力共同理解的稳定领域值，例如 `CheckoutDraft`、`ValidatedCheckout` 或提交快照；请求 DTO、SDK 类型和组件 props 留在各自所有者旁边，避免它变成新的 `types.ts` 杂物箱。

## 状态与副作用所有权

| 所有者 | 拥有的状态 | 拥有的副作用及策略 | 对外提供 |
|---|---|---|---|
| `CheckoutPage` | 尽量不新增业务状态 | 成功后的路由跳转，以及确属页面级的埋点 | 组合各能力，生成提交命令 |
| `useCheckoutDraft` | 可编辑字段、touched、dirty、字段错误、编辑版本 | 草稿恢复或离开提醒，仅在现有产品有此行为时保留 | `draft`、`updateField`、`validate`、稳定提交快照 |
| `pricing.ts` | 无 | 无；必须是纯计算 | `calculatePricing(input): PriceBreakdown` |
| `useCoupon` | 当前已应用优惠、请求状态、当前请求身份、可重试错误 | 调用券接口；通常采用 latest-wins，旧请求的成功、失败和 `finally` 都不得覆盖新请求 | `appliedCoupon`、`status`、`apply(code)`、`remove()`、`retry()` |
| `CouponControl` | 尚未应用的输入文字、输入框交互状态 | 聚焦、键盘提交等局部交互 | 语义化优惠券输入 UI |
| `useInventoryAvailability` | 当前商品集合对应的库存快照和订阅状态 | 建立、替换、释放订阅；忽略旧订阅迟到回调 | `availability`、`status` |
| `usePaymentSession` | SDK 会话身份、ready/pending/error 状态 | SDK 初始化、挂载、替换、卸载；清理只释放本实例拥有的资源 | `status` 和窄化后的 `confirmPayment` 命令 |
| `paymentSdkAdapter` | 无 React 状态 | 把第三方 SDK 类型、异常和清理方式转换为 feature 内部契约 | SDK 无关的会话/确认接口 |
| `useCheckoutSubmission` | 当前提交尝试、不可变输入快照、幂等键、pending/success/failure/unknown 状态 | 按现有后端协议协调支付和订单请求，防止双击重复提交，处理超时后的未知结果 | `submit(snapshot)`、`retry()`、提交状态 |
| 各 adapter/client | 不拥有展示状态 | HTTP、SDK、订阅和 DTO 映射 | 规范化数据或明确错误，不返回“空成功” |

几个关键约束：

- 价格应由 `draft + cart + 已应用优惠` 派生，不再复制进 React state。
- 如果金额实际由服务端报价决定，就不要创建本地业务计算器；改由报价 adapter 返回规范化 `PriceBreakdown`，前端只做展示派生。最终金额不能以客户端计算结果作为可信依据。
- 支付卡号等敏感输入由支付 SDK/托管控件持有，不能进入草稿状态。
- 提交开始时冻结完整快照。重试默认重用失败的那次快照，不应悄悄读取之后编辑过的草稿。
- 能否点击提交可以在页面派生，但它只是 UI 提示；提交工作流仍需执行真正的校验和服务端约束。
- 字段错误归表单，优惠券错误归优惠券控件，SDK 错误归支付区域，最终提交错误归 submission。不要再建一个吞掉全部异常的 `errorService`。

## API 边界

Feature 对外只保留现有路由真正需要的入口，例如：

```ts
// features/checkout/index.ts
export { CheckoutPage } from './CheckoutPage';
```

除非已有外部调用者，不公开 hooks、clients、SDK adapter 或 `pricing.ts`。外部消费者不得通过深路径导入内部文件。

Feature 内部使用小而明确的契约：

```ts
type PaymentCommand = {
  confirmPayment(input: PaymentConfirmationInput):
    Promise<PaymentAuthorization>;
};

type CheckoutSubmission = {
  state: SubmissionState;
  submit(snapshot: ValidatedCheckout): Promise<void>;
  retry(): Promise<void>;
};
```

不必为了测试给每个 client 建 repository/interface。支付 SDK 确实是高波动外部边界，值得一个窄 adapter；普通 checkout HTTP 请求若项目数据层已处理缓存、取消和错误，直接复用即可。

## 依赖方向

```text
feature index
    ↓
CheckoutPage（组合）
    ├─→ form / coupon / inventory / payment UI
    ├─→ submission workflow
    └─→ pricing / checkoutModel

UI ─────────────→ hooks、纯模型
workflow ───────→ 纯模型、focused clients/adapters
hooks ──────────→ 各自拥有的 client/adapter
clients/adapters → 项目 HTTP 层、浏览器 API、支付 SDK
纯模型 ─────────→ 不依赖 React、网络、SDK 或浏览器全局
```

各能力不应互相读取内部状态。例如 coupon 不直接改 pricing，inventory 不直接禁止 submission。页面把规范化结果交给计算或提交工作流；真正需要原子一致性的提交顺序则集中留在 `useCheckoutSubmission`，不能拆成几个互相观察状态的 effect。

也不要把以上能力重新包进一个巨型 `useCheckout()`。页面可以协调它们，但不能复制它们的状态、清理和错误。

## 测试放置

测试与行为所有者相邻；若项目已有集中式测试目录，则镜像同样的能力结构，不另创第二套惯例。

- `pricing.test.ts`：金额精度、边界值、优惠叠加规则及输入不变性。只测公开计算契约。
- `useCheckoutDraft.test.tsx`：字段更新、校验、dirty/revision，以及提交期间继续编辑时旧完成结果不会清除新草稿。
- `useCoupon.test.tsx`：用可控 Promise 验证 `A → B → B 成功 → A 失败` 后仍保留 B，旧 `finally` 不得清除 B 的 loading/error 状态。
- `useInventoryAvailability.test.tsx`：商品集合变化时释放旧订阅；卸载后不发布；旧回调不能覆盖新集合。
- `usePaymentSession.test.tsx`：SDK 初始化失败、会话替换、重复清理、卸载后迟到回调。真实 DOM 挂载行为需要组件或浏览器测试。
- `useCheckoutSubmission.test.tsx`：双击只产生一个逻辑尝试、提交快照稳定、幂等键复用策略、支付/下单顺序、超时后的 unknown 状态和安全恢复。
- `CheckoutPage.test.tsx`：保留少量跨能力场景——成功结算、库存阻断、支付或提交失败后的可恢复提示。不要在这里重复所有价格矩阵和竞态测试。
- 真实支付控件、路由跳转和浏览器生命周期应放进项目既有 E2E 套件；当前工作区无法确认其位置或工具。

## 何时停止继续拆分

满足以下条件就停止：

- 每项状态、规则、外部资源、错误和清理都有唯一且容易定位的所有者。
- `CheckoutPage` 主要表达结算流程和组合关系，没有重新实现子能力政策。
- 删除某个边界会导致生命周期混杂、测试困难或真实变更扩散；否则该边界没有存在价值。
- 私有 helper 只服务一个所有者并与其同步变化，就留在同一文件。
- JSX 片段没有独立交互、可访问性或领域含义，就不单独组件化。
- 单次包装函数没有隐藏 DTO、SDK、错误、缓存或竞态政策，就不叫 service。
- 不再出现通用 `utils.ts`、`types.ts`、`services.ts` 收留无法归属的代码。
- 新目录不是为了和别的目录“对称”。

用“替换支付供应商”检查该方案：正常情况下只修改 `paymentSdkAdapter`，必要时调整 `PaymentSection`，而表单、价格、库存和提交状态机继续依赖稳定的 `confirmPayment` 契约。这说明该边界今天已经隐藏了真实波动；不需要提前建设多供应商注册表或通用插件系统。

本地技能中的所有权、异步生命周期和模块依赖指导直接促成了以上“按能力划分、技术角色留在能力内部”的设计。未修改任何文件。