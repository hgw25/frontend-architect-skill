建议把运费规则留在订单页面内，并将总价作为派生值直接计算：

```tsx
const SHIPPING_FEE = 10;

function OrderPage({ order }: { order: Order }) {
  const total = order.subtotal + SHIPPING_FEE;

  return (
    <OrderSummary
      subtotal={order.subtotal}
      shippingFee={SHIPPING_FEE}
      total={total}
    />
  );
}
```

采用这个结构的理由：

- `subtotal` 是已有数据，`total` 可以派生，无需新增 state、effect 或 `useMemo`。
- `SHIPPING_FEE` 命名后，固定运费规则清楚且只需修改一处。
- 当前只有一个消费者，也没有重复逻辑或明确路线图；不创建定价服务、共享 hook、全局配置或独立工具模块。
- 若以后运费变为按地区或重量计算，可在这里把常量替换为 `calculateShipping(order)`；等出现共享规则或第二个消费者时，再提取到领域模块。

验证重点只需覆盖可观察行为，例如小计 90 元时显示运费 10 元、总价 100 元。仓库目前没有应用源文件，因此此次不修改文件，也不虚构现有框架、金额单位或测试设施。