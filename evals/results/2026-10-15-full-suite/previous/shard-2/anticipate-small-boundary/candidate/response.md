建议建立一个“薄但有实际职责”的订单功能边界：隔离接口字段、统一请求状态和错误、集中金额展示；暂不引入 repository、数据源接口或依赖注入。

### 推荐结构

沿用项目既有目录习惯，将以下内容放在订单页附近即可，无须预建复杂分层：

```text
order/
  orderApi.ts       # DTO、请求、响应校验与字段映射
  orderModel.ts     # 页面使用的类型、金额格式化
  OrderPage.*       # 渲染与用户事件
```

如果项目已有 query/composable/hook 模式，请复用它管理请求状态；否则再增加一个页面私有的 `useOrder` / `orderController`，不要自建通用请求框架。

### 1. 接口字段止步于适配边界

```ts
// 仅 orderApi.ts 知道服务端字段名
type OrderDto = {
  total_in_cents: number
}

export type Order = {
  totalCents: number
}

function toOrder(dto: OrderDto): Order {
  if (!Number.isSafeInteger(dto.total_in_cents) || dto.total_in_cents < 0) {
    throw new Error('Invalid order total')
  }

  return {
    totalCents: dto.total_in_cents,
  }
}

export async function fetchOrder(/* 当前请求所需参数 */): Promise<Order> {
  const dto = await existingHttpClient.get<OrderDto>(/* ... */)
  return toOrder(dto)
}
```

页面及其事件函数只使用 `totalCents`，不再读取 `total_in_cents`。若项目已有生成类型或运行时 schema，应复用；不值得仅为这一个字段引入新的校验依赖。无效响应应作为失败暴露，不能默认为 `0`。

### 2. 格式化保持为纯展示转换

```ts
export function formatOrderTotal(
  totalCents: number,
  options: { locale: string; currency: string },
): string {
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
  }).format(totalCents / 100)
}
```

不要把格式化字符串存进请求状态，它可以从 `totalCents` 派生。货币不能从字段名猜测：若接口提供币种，应一起映射；若产品明确固定币种，应定义一个订单功能内的业务常量。

### 3. 请求生命周期由一个所有者管理

状态至少应能区分：

```ts
type OrderLoadState =
  | { status: 'loading' }
  | { status: 'success'; order: Order }
  | { status: 'error'; error: unknown }
```

请求所有者负责：

- 调用 `fetchOrder`
- 设置 loading、success、error
- 页面卸载或参数变化后的过期结果策略
- retry 使用原失败请求的参数
- 将错误交给页面统一渲染或通知

事件函数只表达意图，例如 `reload()`，不再各自 `try/catch`、重复格式化或重复弹提示。底层只在能够翻译错误时捕获；不要在多层重复捕获，也不要把请求失败转换成“空订单”。

### 暂时不要建设

目前只有一个调用方，也没有第二数据源路线图，因此不建议增加：

- `OrderRepository` 接口及唯一实现
- provider/adapter 注册表
- 通用 `Result<T, E>` 体系
- 全局订单 store
- DTO → entity → domain → view-model 的多级复制

`fetchOrder(): Promise<Order>` 本身已经是一个足够小的替换缝。未来真有第二数据源时，再根据两者实际差异提取端口。

这个边界也能应对两个现实变化：接口字段改名只修改 DTO 和映射；金额展示规则或 locale 改变只修改格式化入口。页面调用方式和请求状态无需随之扩散修改。

工作区没有业务源码或框架配置，只有 `.frontend-architect` 与 Git 元数据，因此本次未修改文件；`git status` 保持干净。