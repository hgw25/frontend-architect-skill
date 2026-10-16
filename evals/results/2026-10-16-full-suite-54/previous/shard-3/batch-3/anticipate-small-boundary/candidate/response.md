建议采用“页面协调 + 特性内接口边界 + 纯格式化函数”三层小边界。它解决当前字段泄漏和错误分散的问题，但不引入仓储接口、多数据源适配器或通用 Service 框架。

### 1. 接口边界

在订单特性内提供一个窄函数：

```ts
type Order = {
  totalCents: number;
};

async function fetchOrder(
  input: OrderRequest,
  options?: { signal?: AbortSignal },
): Promise<Order>;
```

该函数负责：

- 发起请求，或复用项目已有的 query/loader。
- 检查 HTTP 结果。
- 在运行时确认 `total_in_cents` 是符合接口约定的整数；是否允许负数应由订单业务确认，不擅自限制。
- 将外部字段 `total_in_cents` 映射为内部字段 `totalCents`。
- 将网络失败、异常响应等转换为页面能够处理的失败结果；不把错误吞掉，也不默认成 `0`。

接口 DTO 保持私有：

```ts
type OrderResponseDto = {
  total_in_cents: number;
};
```

这样如果接口以后改成 `total_minor_units`、增加币种，修改集中在这个边界，页面无需跟着 API 字段重写。

### 2. 金额展示边界

金额只保存为数值，展示文本按需派生：

```ts
function formatOrderTotal(
  totalCents: number,
  options: { locale: string; currency: string },
): string;
```

内部优先使用 `Intl.NumberFormat`。币种不能由 `_in_cents` 猜测，应来自现有产品配置或接口契约。不要把格式化后的字符串写入请求结果或页面状态，否则会形成第二份数据源。

目前只有一个使用点时，该函数可以作为订单特性内的私有 helper，不必建设全局 Money SDK；当其他页面确实共享同一货币规则时再提升为公共能力。

### 3. 页面职责

页面只负责协调可见状态和用户意图：

```ts
type OrderLoadState =
  | { status: "loading" }
  | { status: "success"; order: Order }
  | { status: "error"; error: OrderLoadError };
```

首次进入、重试、手动刷新都调用同一个加载操作。各事件函数不再分别包含：

- `fetch` 和状态码判断；
- `total_in_cents / 100`；
- 各自不同的 `try/catch` 和提示文案。

数据边界负责产生可判断的错误；页面负责决定展示错误页、行内提示还是重试按钮。取消请求不应显示成普通加载失败。若项目已有请求库，应让它继续拥有缓存、取消和重试策略，不另造一套请求状态管理。

### 不建议现在添加

- `OrderRepository` 接口及多个实现。
- 数据源注册表、策略模式或依赖注入容器。
- DTO → Entity → ViewModel 的逐层复制。
- 接收任意字段名、单位和格式选项的通用转换器。
- 在每个事件函数外围重复 `catch` 并返回默认订单。

这些机制没有当前消费者或路线图支撑；上述窄函数已经为真实变化留下了明确修改位置。

最低限度应验证：字段映射、异常响应不会变成金额 `0`、金额格式化包含正确币种，以及首次加载失败后能通过同一加载入口重试。当前工作区没有应用源码，只有任务 Skill，因此此次没有代码修改或可执行测试。