我会采用“页面内命名常量 + 渲染时派生”的结构，不额外抽象计价模块：

```tsx
const SHIPPING_FEE = 10;

function OrderPage({ order }: Props) {
  const subtotal = order.subtotal; // 沿用订单已有金额契约
  const total = subtotal + SHIPPING_FEE;

  return (
    // 直接展示商品金额、运费和总价
  );
}
```

具体判断：

- `total` 是可计算值，不放入 `state`，也不用 `effect` 或 `useMemo`。
- `SHIPPING_FEE` 保留为页面模块内常量，避免散落魔法数字，同时明确它目前只属于该页面。
- 不创建 `calculateOrderTotal`、`usePricing`、计价服务、策略表或全局配置；当前没有复用者或复杂规则，这些边界尚无实际职责。
- 金额表示和格式化沿用项目既有约定；若已有分单位或 `Money` 类型就继续使用，不能仅凭这个需求另造一套。
- 只需覆盖一个代表性检查：商品金额加 10 元后，明细和总价显示一致。

现实后续变化也容易处理：运费从 10 改为 12，只改常量；若将来出现地区、重量、优惠或服务端报价，再把已形成的计价规则提升到明确的领域函数或服务端契约。这样既为当前变化留了一个小接缝，也没有为未经承诺的路线图提前建设框架。

工作区除评估用 `.frontend-architect` 外没有应用文件，因此以上是结构决策，未修改任何文件。