建议采用“一个接口适配器 + 一个请求状态所有者 + 一个纯格式化函数”的小边界。它既解决当前字段和错误处理散落的问题，也不为不存在的第二数据源提前建设 Repository、Provider 或通用请求框架。

当前工作区没有应用源码或框架配置，只有本次 Skill 文件，因此以下是框架无关的具体结构，命名和目录应落到项目现有约定中。

### 1. 接口适配边界

页面不再直接接触 `total_in_cents`。接口模块私有保存 DTO，并向页面返回稳定的内部模型：

```ts
// orderApi.ts

type OrderDto = {
  id: string
  total_in_cents: number
}

export type Money = {
  minorUnits: number
  currency: CurrencyCode
}

export type Order = {
  id: string
  total: Money
}

export async function getOrder(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<Order> {
  const dto = await requestOrder(orderId, options)
  return mapOrder(dto)
}
```

边界职责：

- 沿用已有 HTTP 客户端和响应校验能力。
- 在这里验证外部响应必须满足的条件，例如金额是否为整数；不要在页面中散布断言和默认值。
- 在这里完成 `total_in_cents → total.minorUnits` 的字段语义转换。
- 货币从已确认的接口字段或产品配置取得，不能仅凭字段名猜测。
- 不要把无效金额降级成 `0`，否则接口异常会被伪装成真实订单。

`OrderDto` 不导出，避免接口命名渗入页面。`getOrder` 本身已经是未来替换实现的接缝，当前不需要额外的 `OrderRepository` 接口或服务类。

### 2. 展示格式边界

金额文本是派生值，不进入请求状态，也不在点击、刷新等事件函数中计算：

```ts
function formatMoney(money: Money, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.minorUnits / 100)
}
```

优先复用项目已有的金额或国际化工具。若没有，可先把这个函数放在订单功能内部；只有其他功能确实共享相同货币语义时再上移为公共工具。

页面只表达：

```ts
formatMoney(order.total, locale)
```

这样 locale 变化时直接重新派生，不会出现请求状态中的旧格式文本。

### 3. 请求生命周期边界

由路由 loader、页面级 hook/composable，或项目现有数据请求库中的一个位置统一拥有加载过程：

```ts
type OrderLoadState =
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | { status: 'error'; error: OrderLoadError }
```

它对页面暴露类似：

```ts
const { state, retry } = useOrder(orderId)
```

所有入口采用同一条执行路径：

- 首次进入触发加载。
- 刷新按钮调用 `retry()`。
- 错误页的重试按钮也调用 `retry()`。
- 事件函数不再各自 `try/catch`、格式化数据或弹出重复提示。

只有当界面确实需要不同恢复行为时，才把错误归类为 `not-found`、`forbidden`、`unavailable` 等稳定类别。其他网络或运行时异常保留为失败，由这一状态所有者记录并转成统一的用户提示；不要在每层捕获后原样抛出，也不要转换为空订单。

如果 `orderId` 可能在组件不卸载时变化，请使用现有请求库的 query key/取消机制；否则至少保证旧请求的成功、失败和 `finally` 都不能覆盖新订单状态。

### 4. 建议的责任分布

| 边界 | 拥有内容 | 不应拥有 |
|---|---|---|
| 接口适配器 | DTO、响应校验、字段映射、必要的错误归类 | 页面文案、通知、缓存框架 |
| 请求所有者 | loading/success/error、重试、过期响应策略 | 金额格式、接口原始字段 |
| 金额格式器 | minor units 到本地化文本 | 请求状态、业务错误 |
| 页面 | 根据状态渲染、触发 `retry` | 网络调用细节、DTO、重复 `try/catch` |

一个现实的后续变化是接口把 `total_in_cents` 改成 `{ amount, currency }`：此时只需修改 DTO、映射函数及其边界测试，页面、请求状态和格式化调用保持不变。这已经为常见变化提供了足够的小型边界；第二数据源真正出现后，再根据两者的实际差异决定是否引入 provider/repository 抽象。

本次仅提出实现边界，没有修改任何文件。