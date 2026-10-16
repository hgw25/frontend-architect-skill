建议直接采用纯 TypeScript 汇总，不在内部重复验证：

```ts
export interface ValidatedOrder {
  readonly amount: number;
}

export function sumOrderAmounts(
  orders: readonly ValidatedOrder[],
): number {
  return orders.reduce((total, order) => total + order.amount, 0);
}
```

决策原则：

- 信任适配层已经建立的 `ValidatedOrder` 契约，不在汇总函数中重复 `typeof`、`Number.isFinite`、可选链或默认值处理。
- 使用 `readonly` 表达“不修改输入”；空集合明确汇总为 `0`。
- 不用 `try/catch` 将错误吞成 `0`，否则契约破坏会伪装成合法业务结果。内部违规属于编程错误，应直接暴露并修复调用链。
- 沿用 JavaScript `number` 的精度语义，不在汇总阶段擅自四舍五入。若金额要求精确货币运算，应把契约改为整数最小货币单位或既有 Decimal 类型，并在适配层完成转换。
- “每项有限”不保证极端数值相加后仍有限。当前没有总额必须有限或金额上限的要求，不额外发明检查；若将来确认该领域约束，应在金额领域类型/适配层加入合理范围，并为汇总结果定义明确的溢出错误。

最有价值的测试是：多订单求和、空数组返回 `0`、输入对象保持不变。无需测试非法金额，因为它不属于该函数的可达输入契约。

将来增加表单、URL、存储或其他外部入口时，调整点应是新入口的适配层：

```ts
function parseExternalOrder(input: unknown): ValidatedOrder {
  // 在这里验证结构与 amount，并返回内部类型；
  // 失败时返回项目既有的结果类型或抛出可识别的边界错误。
}
```

如果多个外部入口遵循相同订单契约，就在适配层提取共享解析器；各入口负责把验证失败映射为对应的 UI/请求错误。不要扩大 `sumOrderAmounts` 的参数类型，也不要让它开始接收和修复原始外部数据。

工作区没有应用源码、测试或包配置，因此未修改文件，也无法运行项目级验证；`.frontend-architect` 保持未变。