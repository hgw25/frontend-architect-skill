建议建立一个“功能内的小边界”，不引入 Repository、Provider 接口、全局 Store 或通用请求框架。

工作区目前没有应用源码、依赖清单或框架约定，只有本次指定的 Skill 文件，因此下面是可直接落地的框架无关设计，不假定项目已有能力。

### 建议边界

```text
订单页
  ├─ loadOrder()：唯一的页面加载操作，维护 loading/success/error
  ├─ render：只使用内部 Order，不认识 total_in_cents
  └─ 初次加载、刷新、重试事件：都调用 loadOrder()

order-api
  ├─ 发起请求
  ├─检查 HTTP 状态和响应结构
  └─ 将接口响应转换为内部 Order
```

最小契约可以是：

```ts
// 仅存在于接口边界内
type OrderResponse = {
  total_in_cents: number
}

// 页面使用的稳定模型
type Order = {
  totalCents: number
}

async function fetchOrder(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<Order>
```

`fetchOrder` 内完成：

1. 请求接口；
2. 处理非成功 HTTP 状态；
3. 验证 `total_in_cents` 是有效整数；
4. 映射成 `{ totalCents }`；
5. 抛出页面可以统一处理的错误。

不要让 `OrderResponse` 或 `total_in_cents` 越过这个边界。接口字段以后改名、嵌套或改变单位，只需修改这里。

### 格式化的归属

金额格式化应是纯派生值，不存进状态，也不分散在事件函数中：

```ts
function formatOrderTotal(
  totalCents: number,
  options: { locale: string; currency: string },
): string {
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
  }).format(totalCents / 100)
}
```

优先复用项目已有的金额格式化能力。币种必须来自已知业务配置或接口契约，不应根据 `_in_cents` 猜测。

页面渲染时调用它：

```ts
const displayedTotal = formatOrderTotal(order.totalCents, {
  locale,
  currency,
})
```

### 请求错误的归属

页面只保留一个加载入口：

```ts
type LoadState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error }

async function loadOrder() {
  setState({ status: 'loading' })

  try {
    const order = await fetchOrder(orderId)
    setState({ status: 'success', data: order })
  } catch (error) {
    setState({
      status: 'error',
      error: normalizeOrderError(error),
    })
  }
}
```

初次加载、刷新按钮、重试按钮只调用 `loadOrder`，不要各自重复 `try/catch`、提示文案和金额转换。

错误只分类到页面确实会区别展示或恢复的程度，例如“无权限”“不存在”“暂时不可用”。若 UI 对它们没有不同处理，就不要预先设计庞大的错误码体系。错误不能被转换成金额 `0` 或空订单，否则失败会伪装成成功。

若路由中的订单 ID 可能在请求期间变化，应使用现有数据层的请求标识或 `AbortSignal`，防止旧订单结果覆盖新订单；固定 ID 页面无需为此自建请求框架。

### 暂时不要增加

- `IOrderRepository`、多数据源 Provider 或适配器注册表；
- 全局订单 Store；
- 自制缓存、重试引擎或 Result 类型体系；
- 仅为了 `total_in_cents` 创建多层 DTO → Entity → ViewModel。

现实的后续变化也能被这个小边界吸收：接口将金额改成嵌套结构时，只改响应解析和映射；展示改币种或本地化时，只改格式化入口；未来真的出现第二数据源时，再根据两个真实来源提取共同接口。

本次是设计建议，且工作区没有应用代码，因此未修改文件或运行应用测试。