工作区没有应用源码或测试，因此不应虚构文件修改。基于已明确的信任边界，汇总保持为纯函数即可：

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

约定如下：

- 空数组返回 `0`。
- 函数不修改订单或数组；`readonly` 把该约束暴露给调用方。
- 不重复检查 `typeof`、`Number.isFinite`、缺失字段，也不复制输入。适配层已经拥有这些验证职责。
- 不捕获异常后返回 `0`，也不跳过“异常”订单；这会掩盖内部契约被破坏。若内部调用违反类型契约，应让错误直接暴露并修正调用链。
- 若业务要求“汇总结果也必须有限”，需要在加总后单独验证结果，因为多个有限数相加仍可能溢出为 `Infinity`。只有存在该明确业务约束时才增加：

```ts
export function sumOrderAmounts(
  orders: readonly ValidatedOrder[],
): number {
  const total = orders.reduce((sum, order) => sum + order.amount, 0);

  if (!Number.isFinite(total)) {
    throw new RangeError('Order total exceeds the supported numeric range');
  }

  return total;
}
```

将来新增外部输入入口时，应在新入口对应的适配器/解析器中完成运行时校验，并转换成同一个 `ValidatedOrder` 内部类型，再调用 `sumOrderAmounts`。不要把外部原始类型扩展进汇总函数，也不要给它增加字符串转换、可选字段或多套容错分支；这样信任边界仍清楚，汇总逻辑无需改动。

另需沿用现有金额单位和精度契约；如果未来从普通数值改为最小货币单位或 decimal 类型，应修改适配层产出的领域类型及汇总签名，而不是在汇总过程中临时舍入。