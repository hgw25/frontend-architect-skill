当前仓库是空 Git 树，没有可安全迁移的源码或调用点，因此未创建占位项目、也未改动 `.frontend-architect`。

建议采用最小而清晰的两层职责：

```text
order/
├── order.ts                 # 工单类型、状态标签、标题规则等纯逻辑
└── order.local-storage.ts   # localStorage 序列化、读取和写入
```

同时删除 `data/manager.ts`。它只转发调用，既没有缓存、协调、错误策略等“管理”职责，项目也没有要求 `data/manager` 这一层；保留它只会让调用链变成无意义的 `caller → manager → implementation`。

命名建议：

```ts
// order.ts
export type Order = ...
export type OrderStatus = ...

export function getOrderStatusLabel(status: OrderStatus): string
```

标题校验名称应匹配返回契约：

- 返回 `boolean`：`isOrderTitleValid`
- 返回错误文本或 `undefined`：`getOrderTitleError`
- 返回结构化结果：`validateOrderTitle`

```ts
// order.local-storage.ts
export function readStoredOrders(): Order[]
export function writeStoredOrders(orders: readonly Order[]): void
```

存储 key、JSON 序列化和外部数据校验应由 `order.local-storage.ts` 私有持有；调用方直接依赖该模块。若将来改用 IndexedDB，只需替换这一明确边界。暂不引入 `Manager`、`Repository`、接口或依赖注入，因为目前没有多实现、缓存或异步策略支撑这些抽象。

如果状态标签之后进入国际化体系，再把它移到现有 i18n/presentation 层；在没有该事实前，不必提前拆成更多小文件。