建议把汇总函数保持为依赖明确契约的纯函数：

```ts
export interface ValidatedOrder {
  readonly amount: number
}

export function sumOrderAmounts(
  orders: readonly ValidatedOrder[],
): number {
  return orders.reduce(
    (total, order) => total + order.amount,
    0,
  )
}
```

决策与原则：

- `readonly` 表达“不修改输入”的契约；函数只返回派生值。
- 空订单集合返回 `0`，即加法单位元。
- 不在汇总函数内重复执行 `Number.isFinite`、结构校验或 `try/catch`。
- 不把异常转换成 `0` 或跳过订单，否则会把契约破坏伪装成有效结果。
- 内部出现缺字段等问题应直接暴露为编程错误，并在测试或统一错误边界中被发现。
- 不在汇总过程中擅自四舍五入。若金额需要精确货币语义，应由领域契约规定最小货币单位整数或 decimal 类型。
- 如果总和也必须保证有限，需要明确该领域约束；可在这里检查一次聚合结果，因为“每项有限”理论上并不能防止极端数值相加后溢出。

将来新增表单、URL、存储或第三方响应等外部入口时，应在该入口的适配层增加运行时解析：

```ts
function parseOrder(input: unknown): ValidatedOrder {
  // 校验对象结构、amount 类型、Number.isFinite(amount)
  // 失败时返回项目约定的结果类型或抛出明确的边界错误
}
```

每个外部入口都先转换成同一个 `ValidatedOrder` 契约，再调用 `sumOrderAmounts`；无需修改汇总函数。边界错误由入口对应的请求、提交或加载流程负责呈现和记录。

工作区没有现有源码或项目约定，因此未创建臆测路径下的文件；`.frontend-architect` 保持未修改。