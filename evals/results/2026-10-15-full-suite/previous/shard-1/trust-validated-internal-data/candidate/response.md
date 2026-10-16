仓库为空，没有现有技术栈、类型或测试可复用，因此未创建文件。按已给契约，汇总函数应信任适配层，不重复校验：

```ts
// 实际项目中应直接导入适配层已有的订单类型。
type AdaptedOrder = Readonly<{
  amount: number
}>

export function sumOrderAmounts(
  orders: readonly AdaptedOrder[],
): number {
  return orders.reduce((total, order) => total + order.amount, 0)
}
```

决策如下：

- 空订单集合返回 `0`。
- `readonly` 表达不修改数组及订单的约定；函数保持纯计算。
- 不在这里重复调用 `Number.isFinite`，也不通过过滤、`try/catch` 或默认值掩盖契约违例。
- 外部数据的格式错误应由接口适配层报告；内部编程错误则自然抛出，由既有应用错误边界处理。
- 不自行改成分、`bigint` 或 Decimal，因为仓库没有证据表明现有金额语义需要改变。
- 若汇总结果本身必须保证有限，当前“每项有限”仍不足以排除加法溢出。应补充金额范围/订单数量这一领域约束，优先在适配或领域构造边界落实；只有汇总阶段才能确定的溢出，则在返回前抛出明确的 `RangeError`，而不是返回 `Infinity`。

将来增加 URL、表单、本地存储等外部入口时，在新入口旁增加解析和运行时验证，将其转换成同一个 `AdaptedOrder` 类型后再调用此函数。汇总函数无需新增入口判断；若多个入口开始重复同一套验证，再抽取共享的 `parseOrder`/schema，由各外部适配器调用。