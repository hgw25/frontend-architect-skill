工作区除 `.frontend-architect` 与空 Git 提交外没有项目文件，未找到 `CheckoutPage.tsx`、`package.json` 或测试配置。因此无法确认现有表单库、请求层、支付 SDK 和导出约定。下面是基于题述职责的目标划分；落地时应沿用项目已有命名和基础设施，而不是新建平行体系。

核心判断：不要机械地把 900 行分别搬进四个大目录，更不要形成一个同样庞大的 `useCheckout()`。应按规则所有权、异步策略和资源生命周期拆分。

## 建议结构

```text
features/checkout/
  index.ts                         # 有意控制的 feature 公共入口
  CheckoutPage.tsx                 # 路由适配与能力组合

  model/
    checkoutDraft.ts              # 草稿模型、同步校验、纯状态转换
    pricing.ts                    # 价格/优惠的纯计算与展示投影
    submissionState.ts            # 提交状态及合法转换（需要时）

  hooks/
    useCheckoutDraft.ts
    useCouponApplication.ts
    useInventoryAvailability.ts
    usePaymentSession.ts
    useCheckoutSubmission.ts

  adapters/
    checkoutApi.ts                 # 优惠券/下单请求映射；同一后端时先合放
    inventorySubscription.ts       # 库存订阅协议适配
    paymentSdk.ts                  # 第三方 SDK 初始化、调用与销毁适配

  components/
    CheckoutForm.tsx
    CouponField.tsx
    InventoryNotice.tsx
    PaymentMethodSection.tsx
    OrderSummary.tsx
    CheckoutErrorSummary.tsx

  CheckoutPage.integration.test.tsx
```

不建议为了目录对称立即创建所有文件：

- 若优惠券与下单使用同一生成客户端、共享相同错误映射，先放在 `checkoutApi.ts`，不要制造两个转发式 service。
- `submissionState.ts` 只有在提交状态转换确实复杂、需要纯测试时才独立；否则与 `useCheckoutSubmission.ts` 放在一起。
- JSX 中的地址、联系人、配送区域，只有具备独立校验、交互或无障碍职责时才提取组件，不能仅因为它们是一个视觉区块。
- 不建立宽泛的 `utils.ts`、`types.ts`、`services/index.ts`。局部帮助函数留在所有者文件中；纯领域规则按 `pricing`、`checkoutDraft` 等实际概念命名。

## 对外公开 API

Feature 外部默认只公开现有路由所需的入口，并保持现有导出形式：

```ts
export { CheckoutPage } from './CheckoutPage'
```

如果当前路由直接导入文件，则不必为了形式增加 `index.ts`。以下内容保持 feature 私有：

- `useCouponApplication`
- `useInventoryAvailability`
- `usePaymentSession`
- `useCheckoutSubmission`
- API/SDK adapters
- 草稿与提交内部状态
- 页面内部组件

只有出现真实外部消费者时，才从公共入口增加稳定的领域类型或能力。其他 feature 不应通过 `features/checkout/hooks/...` 深层导入内部实现。

## 状态与副作用所有权

| 所有者 | 拥有的状态/副作用 | 内部契约 |
|---|---|---|
| `useCheckoutDraft` | 可编辑草稿、dirty/touched、同步校验、草稿重置 | 暴露领域字段更新、`validate()` 和只读草稿快照；若已有表单库，应封装或直接复用其模型，不再复制一套表单状态 |
| `pricing.ts` | 不拥有状态和副作用 | 输入商品、配送选择、已确认优惠等数据，返回 `PricingBreakdown`；金额、折扣、税费、合计只从这些输入派生 |
| `useCouponApplication` | 优惠券输入、请求状态、已应用优惠、可恢复错误、请求身份 | `apply(code)`、`clear()`、`retry()`；请求使用提交时的完整价格上下文快照 |
| `useInventoryAvailability` | 当前商品集合对应的库存快照、连接状态、订阅错误 | 输入稳定的商品身份集合；负责订阅、更换订阅、退订和忽略旧订阅回调 |
| `usePaymentSession` | SDK 实例、支付会话、ready/error 状态及销毁 | 向提交工作流提供窄的 `confirmPayment(...)` 能力，不向页面泄漏原始 SDK 实例 |
| `useCheckoutSubmission` | 一次下单尝试的不可变快照、提交中/成功/失败/结果未知状态、重复触发策略 | `submit(snapshot)`；借用支付能力并调用下单 adapter，但不重新拥有草稿、库存、优惠或 SDK 生命周期 |
| `CheckoutPage` | 只负责组合上述能力、建立页面级提交顺序和路由结果处理 | 不复制子能力状态，不实现请求细节，不集中处理所有 cleanup |
| 展示组件 | 局部输入交互、焦点与反馈呈现 | 只接收领域值和动作，不解析网络响应，不直接调用 SDK 或 HTTP |

草稿和提交快照必须分开。用户点击提交时创建只读快照；之后继续编辑表单，不能改变进行中请求或“重试上一次提交”的含义。

价格权威性必须保持当前契约：若现有金额是服务端报价，`pricing.ts` 只能做投影和格式化，不能在客户端重新实现权威规则；若当前确实由客户端计算，则原计算完整迁移为纯函数，不借重构偷偷改变舍入和优惠顺序。

## 关键异步策略

优惠券通常适用“最新请求才可发布”：

```text
申请 A → 申请 B → B 成功 → A 失败
最终状态仍应是 B 成功，A 的错误和 finally 也不能覆盖 B。
```

中止旧请求可以节省工作，但仍需请求身份检查，因为中止不保证服务端或客户端停止完成回调。

库存订阅必须由 `useInventoryAvailability` 完整拥有：

- 商品身份变化时先让旧订阅失效，再建立新订阅。
- cleanup 只释放该 hook 获取的订阅，不能关闭共享连接。
- 卸载或替换后，旧回调不得发布库存状态。

支付 SDK 的获取、部分初始化失败、替换和销毁属于一个生命周期。`PaymentMethodSection` 负责挂载位置和本地可访问性表现，`usePaymentSession` 负责资源；不可由页面、组件和提交 hook 分别销毁同一个实例。

提交策略应明确区分：

- 页面内重复点击：按钮禁用加命令级 guard。
- 重试或多客户端重复请求：只有服务端支持稳定幂等键时才能声称幂等。
- 请求超时：如果无法确认服务端结果，应进入“结果未知/待核对”状态，而不是直接显示明确失败并盲目重试。
- 支付确认与创建订单的顺序应作为一个工作流保留，不要拆成需要页面手工按顺序调用的多个步骤。

## 错误呈现

错误在能够恢复或准确呈现的层处理，避免同一错误既 toast 又内联又写入总错误：

- 优惠券拒绝：`CouponField` 就地显示并提供重试/清除。
- 支付初始化或确认错误：`PaymentMethodSection` 显示。
- 库存变化：在相关商品或 `InventoryNotice` 显示；若阻止提交，也参与页面级校验摘要。
- 服务端稳定字段错误：映射回对应表单字段。
- 无稳定字段身份的下单错误：进入 `CheckoutErrorSummary`，并按既有无障碍约定移动焦点或通过 live region 宣告。
- 意外运行时错误：沿用项目现有错误边界与日志机制，不在每个 adapter 中 catch 后伪装为空成功。

## 内部依赖方向

```text
feature 公共入口
        ↓
CheckoutPage（组合）
   ├── components
   ├── hooks/workflows
   └── adapters 的实例或能力
          ↓
hooks/workflows ──→ model
          ↓
       adapters ──→ 现有 HTTP 客户端 / 支付 SDK / 订阅基础设施

model 不依赖 React、浏览器 API、transport 或 SDK
components 不依赖 adapters
adapters 不依赖 hooks 或 components
```

在规模尚小时，hook 可以直接调用具体 adapter；不要只为测试创建 repository 接口和依赖注入容器。若确实存在多实现、运行时替换或复杂集成测试，再由 `CheckoutPage` 注入小型函数能力。

## 测试放置

测试应跟随行为所有者，不跟随机械目录分类：

- `model/pricing.test.ts`
  - 折扣顺序、金额舍入、零值、不可叠加规则。
  - 若服务端权威，只测试响应到展示模型的映射，不复制服务端业务规则。

- `model/checkoutDraft.test.ts`
  - 草稿转换和同步校验不变量。
  - 不测试表单库本身。

- `hooks/useCouponApplication.test.tsx`
  - 用可控 Promise 验证 A/B 请求乱序。
  - 旧成功、旧错误和旧 `finally` 均不能覆盖当前状态。
  - retry 使用失败时的原始快照。

- `hooks/useInventoryAvailability.test.tsx`
  - 初次订阅、商品身份变化、卸载退订。
  - 旧订阅回调被忽略，仅释放自身资源。

- `hooks/usePaymentSession.test.tsx`
  - 初始化、ready、部分失败、会话替换、卸载。
  - 每个实例恰好由所有者释放，不暴露 SDK 内部对象。

- `hooks/useCheckoutSubmission.test.tsx`
  - 双击只产生一次本地提交。
  - 提交期间编辑草稿不改变请求快照。
  - 支付与下单调用顺序、失败恢复、结果未知状态。
  - 仅在后端契约支持时测试幂等键行为。

- `components/*.test.tsx`
  - 标签、键盘操作、错误关联、焦点和状态宣告。
  - 测用户可见行为，不断言 hook 的私有计数器。

- `CheckoutPage.integration.test.tsx`
  - 用假的网络/SDK边界跑完整结算路径。
  - 至少覆盖优惠券乱序、库存变化阻止提交、支付未就绪、重复提交。
  - 不要把每个内部 hook 都 mock 掉，否则无法验证组合契约。

支付 SDK 的真实 DOM 挂载、导航或浏览器资源释放若是交付风险，再补一条浏览器级测试；单元测试不能证明真实 SDK 集成有效。

## 推荐迁移顺序

1. 先用特征测试固定当前价格、优惠、提交顺序和主要错误表现。
2. 提取纯 `pricing` 与草稿规则，页面仍直接调用，确认无行为变化。
3. 提取库存和支付 adapters，把外部协议与 React 生命周期隔离。
4. 逐个提取优惠券、库存、支付和提交 hook；每次只迁移一个状态所有者。
5. 最后按可识别交互职责提取组件，让 `CheckoutPage` 留下可顺读的组合流程。
6. 删除原页面中的重复 state、effect、cleanup 和错误映射；不能让新旧所有者并存。

## 停止继续拆分的条件

达到以下状态即可停止，不设页面行数目标：

- 普通维护者能直接找到草稿、价格、优惠券、库存、支付和提交的唯一所有者。
- `CheckoutPage` 展现组合与提交主路径，而不是转发几十个无意义的包装函数。
- 每项外部资源只有一个获取与释放者，每个异步操作有明确的竞态策略。
- 状态没有在 page、hook 和 component 中重复保存。
- 新文件有独立的规则、生命周期、错误或交互契约；若只是改名转发，就不拆。
- 私有单次使用 helper 与所有者一起修改且抽出后更难阅读，就继续内联或同文件放置。
- 新目录若只含一个没有独立概念的文件，不创建目录。
- 删除某个边界若不会损害所有权、可测试性或变更定位，该边界就不应存在。

用两个现实变化检验这套结构：

- 替换支付 SDK 应主要限定在 `paymentSdk`、`usePaymentSession`、支付区及其测试，草稿和定价无需感知。
- 配送方式变化后需要重新校验优惠券，应修改优惠券请求身份及其测试，页面只提供新的价格上下文；不应在页面新增第二套请求竞态逻辑。

本次为只读设计建议；没有修改工作区文件，也无法执行项目测试，因为仓库中没有实际应用源码或测试配置。