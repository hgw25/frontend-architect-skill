商品筛选增加库存条件。现有数据模块现在提供 `availableProductIds`，其中的商品有库存。
使用 Product stock 下拉框提供 All / In stock / Out of stock，值分别为空字符串、in、out，
已生效值写入 `p_stock`。沿用商品的 Apply、Reset、URL 和历史行为，Reset 恢复 All。
订单筛选保持原有行为。完成这项需求。
