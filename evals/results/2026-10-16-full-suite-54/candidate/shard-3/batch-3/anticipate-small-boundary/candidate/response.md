建议建立一个“功能内的小型适配边界”，现在不引入 Repository、数据源接口或通用请求框架。

```ts
// API 字段只在这里出现，不向页面泄漏
type OrderResponse = {
  id: string
  total_in_cents: number
}

type Money = {
  minorAmount: number
  currency: CurrencyCode
}

type Order = {
  id: string
  total: Money
}

function mapOrder(response: OrderResponse): Order

async function getOrder(
  orderId: string,
  options?: { signal?: AbortSignal },
): Promise<Order>
```

推荐职责划分：

1. `getOrder`
   - 负责调用已有 HTTP 客户端。
   - 将接口响应映射为页面使用的 `Order`。
   - 保留拒绝状态，不弹 Toast、不写页面状态。
   - 只翻译页面确实需要区分的错误，例如 `not-found`、`forbidden`；其他网络异常沿用项目现有错误约定。

2. `mapOrder`
   - 是 `total_in_cents` 唯一出现的位置。
   - 将蛇形命名和“分”这一传输细节转换成明确的领域数据。
   - 币种应来自接口或现有产品配置；不能仅凭字段名猜测。

3. `formatMoney`
   - 统一使用 `Intl.NumberFormat`，接收 `Money` 和当前 locale。
   - 只负责展示，不发请求、不维护状态。
   - 页面、弹窗、按钮文案等都调用这一处，避免各自除以 100、拼货币符号。

```ts
function formatMoney(money: Money, locale: string): string
```

4. 页面级数据所有者
   - 使用项目已有的查询库、路由 loader 或页面 hook；不要再造并行机制。
   - 集中拥有 `loading / success / error` 和重试行为。
   - 各事件函数只表达意图，例如 `reload()`，不各自重复 `try/catch`、格式转换和提示。
   - 若没有现成查询能力，可用互斥联合表示状态，避免多个布尔值互相矛盾：

```ts
type OrderLoadState =
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | { status: 'error'; error: OrderLoadError }
```

错误提示由页面状态边界统一呈现一次；底层函数不要同时 Toast。重试应使用失败请求对应的 `orderId`。路由参数变化或卸载时传递取消信号，并避免旧请求覆盖新订单。

不建议现在做：

- `OrderRepository` 接口及多个实现；
- 通用 mapper 注册表；
- 完整的 `Money` 类和运算框架；
- 为单次读取在全项目推广 `Result` 类型；
- 只有转发作用的 `service → manager → handler` 调用链。

这个边界已经能承受两个现实变化：接口将 `total_in_cents` 改成金额对象时只修改适配层；新增另一处金额展示或切换 locale 时只复用/调整格式化函数。如果未来真的出现第二个数据源，再从 `getOrder` 的稳定返回契约中提取端口即可。

仓库中除 `.frontend-architect` 外没有发现应用实现文件，因此以上是框架无关的边界设计，未声称已匹配某个现有请求库，也没有代码或测试变更。本地 Skill 的指导直接影响了取舍：保留一个今天就能消除字段泄漏和重复错误处理的小边界，同时不为尚无路线图的第二数据源建设通用架构。