采用页面内派生计算，不新增 Hook、服务层或共享工具：

```tsx
const SHIPPING_FEE_YUAN = 10;

function OrderPage({ order }) {
  const total = order.subtotal + SHIPPING_FEE_YUAN;

  return (
    // 展示商品金额、运费和总价
  );
}
```

理由：

- `total` 是现有数据的派生值，不应放入 state，避免两个事实来源。
- 命名常量比裸写 `+ 10` 更清楚，但仍与唯一消费者放在同一页面模块。
- 当前没有重复代码、缺陷、其他消费者或路线图，不值得提前创建 `calculateOrderTotal`、运费策略、Context、Store 或独立领域层。
- 若项目既有金额单位是“分”，则常量也用分（`1000`），并沿用已有货币格式化方式。
- 将来若运费由订单或接口提供，只需把计算改成 `order.subtotal + order.shippingFee`；届时再根据真实规则决定是否抽取。

现实的后续变化仍可局部完成，因此当前这种“具名常量 + 页面内派生值”是成本最低且易维护的结构。工作区除评估 Skill 与 Git 元数据外没有应用文件，因此未修改任何文件。