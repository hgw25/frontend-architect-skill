结论：采用“功能内的窄接口边界 + 单一请求状态所有者 + 纯展示格式化函数”即可。不要现在引入 Repository 接口、数据源策略、通用请求框架或多层 DTO/Entity/ViewModel。

工作区目前只有 `.frontend-architect` 指引和 Git 元数据，没有应用源码，因此以下边界不绑定 React、Vue 或特定目录规范。

```text
订单页
├── 订单加载协调者：管理 loading / success / error / retry
├── orderApi：请求、响应校验、接口字段映射、必要的错误翻译
└── formatOrderTotal：把内部金额转换为展示文本
```

建议的契约：

```ts
// 外部结构仅留在 API 边界内
type OrderResponse = {
  id: string
  total_in_cents: number
}

// 页面使用的最小内部模型
type Order = {
  id: string
  totalCents: number
}

async function getOrder(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<Order>
```

`getOrder` 应负责：

- 复用项目现有 HTTP 客户端、鉴权和状态码处理。
- 检查响应中的 `total_in_cents` 是否为安全整数；是否允许负数应以订单契约为准。
- 只在这里完成 `total_in_cents → totalCents` 映射。
- 仅翻译页面确实需要区别处理的错误，例如 404；其余请求失败沿用项目错误约定抛出，不能转成“空订单”。
- 支持项目已有的取消机制，但不自建缓存或请求引擎。

金额仍以整数分保存，不把格式化字符串或除以 100 后的浮点值写入状态：

```ts
function formatOrderTotal(
  totalCents: number,
  locale: string,
  currency: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(totalCents / 100)
}
```

币种不能从 `total_in_cents` 推断，应取自已有业务配置或接口契约。若币种尚未明确，这是接入前需要补齐的唯一关键契约，而不是在前端默认成某种货币。

页面侧只保留一个加载入口，例如 `loadOrder(orderId)`；首次进入、刷新和重试都调用它。各事件函数不再分别 `try/catch`、转换金额或拼错误文案。状态可以明确表示：

```ts
type OrderLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | { status: 'error'; error: Error }
```

若路由中的订单 ID 可能在请求期间变化，应复用框架或数据层的请求身份/取消能力，保证旧订单的成功、错误和 `finally` 都不能覆盖新订单状态。

文件上保持功能内聚即可：

```text
order/
  orderApi.ts             // DTO、校验、映射、getOrder
  orderPresentation.ts    // formatOrderTotal；若最终只剩一个简单调用，也可留在页面旁
  OrderPage.*             // 状态、加载编排、渲染
```

现实变化检查：

- 后端把 `total_in_cents` 改名：只改 `orderApi` 的响应解析与映射。
- 金额展示规则或语言地区变化：只改格式化函数或其配置。
- 页面增加刷新入口：复用同一个加载操作，不复制错误处理。
- 将来真的出现第二数据源或多个调用方：届时再依据共同契约提取 `OrderRepository`；当前不预建。

最有价值的验证是：API 映射及非法金额响应、指定 locale/currency 的显示结果、加载失败后的可见错误与重试，以及订单 ID 快速切换时旧响应不会覆盖新结果。