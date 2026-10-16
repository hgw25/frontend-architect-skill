建议把运费和总价都留在订单页面内，作为普通派生值：

```tsx
const FIXED_SHIPPING_FEE = 10;

function OrderPage({ order }: OrderPageProps) {
  const shippingFee = FIXED_SHIPPING_FEE;
  const total = order.subtotal + shippingFee;

  return (
    <OrderSummary
      order={order}
      shippingFee={shippingFee}
      total={total}
    />
  );
}
```

采用这个结构的理由：

- `total` 可以由订单金额和运费计算，不存入 state，避免多个事实来源。
- 用具名常量代替散落的 `10`，表达业务含义，也方便以后修改固定金额。
- `shippingFee` 单独成为局部派生值，是一个成本很低的变化接缝：以后若出现按地区或重量计费，只需把这一行替换成 `calculateShipping(order)`。
- 当前没有重复规则、第二个消费者或明确路线图，因此不建立共享工具、运费服务、策略接口、Context 或配置系统。
- 不需要 `useMemo`、`useEffect`；这只是廉价的同步计算，应在渲染时直接派生。
- 金额单位沿用项目现有契约；若项目使用“分”，常量应写成 `1000` 并按现有格式化能力展示，不另造金额体系。

工作区除任务 Skill 外没有应用文件，因此这里无法绑定真实字段名；`order.subtotal` 和组件名只是结构示意。真正实现时应替换为项目已有的订单金额字段和展示组件。