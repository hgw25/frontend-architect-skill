# 看板卡片排序设计

## 范围与事实

目标是让 80 张稳定 ID 的卡片可通过按钮或拖拽连续重排：业务顺序立即生效，卡片平滑到达
新位置，键盘触发的按钮焦点仍在同一张卡片上。最近一次顺序必须最终保存；失败可见且可重试。
看板隐藏时不得遗留动画或异步 UI 更新，减少动态效果时直接呈现终态。

已确认的契约：`src/data.mjs` 是卡片内容和 ID 的来源；`src/api.mjs#saveOrder(ids)` 是唯一的
持久化调用；`ol[aria-label="Board"]` 与 `data-card-id` 是公开视图标记。现有测试替身提供保存
端点，不能代表线上服务验收。当前 `draw()` 重建列表且每项穿插布局读取，不能满足连续操作。

## 实施序列（4 步）

1. 建立 `Board` 渲染所有权：`src/app.mjs` 持有唯一的 `order` 数组和按 ID 缓存的 `li`，初次创建
   卡片，后续仅按当前顺序重新插入既有节点。完成条件：卡片节点身份和按钮焦点在排序后保留。
2. 在 `moveCard(id, targetIndex)` 统一按钮与拖拽：按钮计算相邻目标，拖拽把手根据指针结束位置
   计算目标卡片索引；更新 `order` 后调用渲染。完成条件：两种入口得到相同订单，边界移动无变化。
3. 在排序边界实现 FLIP：变更前批量读取每个卡片矩形，DOM 达到最终顺序后读取最终矩形，以
   `transform` 反转位移并用 Web Animations API 播放。新排序会取消旧动画；隐藏时取消全部；
   `prefers-reduced-motion` 不创建动画。完成条件：快速连续操作不回跳，滚动/缩放/隐藏后无运行动画。
4. 建立保存协调器：一次仅发送一个快照；在飞行请求结束后只提交尚未确认的最新 `order`。失败保留
   当前顺序、显示 `role=alert` 和 Retry；重试发送失败快照。完成条件：旧成功不覆盖新意图，失败后
   重试的请求体与失败快照相同，成功显示 `role=status`。

## 合同与所有权

`moveCard(id, targetIndex)` 接受卡片 ID 和最终插入索引，原地更新唯一顺序事实并触发视觉更新和
保存请求；它不等待网络。`renderBoard({ animate })` 负责 DOM 顺序、FLIP 测量和动画句柄；业务状态
已是最终顺序，动画不保存第二份排序状态。`SaveCoordinator.request(order)` 复制传入快照并拥有请求
串行化、最新快照、失败/重试提示；页面仅消费其状态回调。`disposeBoard()` 取消动画和移除指针会话，
使隐藏后的回调不能重建可见看板。

选择 FLIP 而非 CSS transition：重排同时改变多张网格卡片的几何位置，且连续操作需要从当前视觉
位置平滑衔接；在 DOM 到达正确终态后以 transform 动画可保留唯一业务事实。原生 Web Animations
API 足以支持取消和清理，无需增加库。拖拽保留同一业务入口，按钮是键盘和非拖拽替代方案。

## 技术架构

```text
按钮 / 拖拽把手
        | moveCard(id, targetIndex)
        v
app.mjs: order（唯一事实） ----> SaveCoordinator ----> api.mjs: saveOrder ----> /api/order
        |
        v
renderBoard + nodeById ----> DOM ol/li ----> FLIP animator (Web Animations API)
        ^                                      |
        +------------ status / alert <---------+
```

## 数据流：连续操作与失败

```text
用户 Enter / pointerup
  -> 计算目标索引 -> moveCard
  -> order 更新为 [最新 IDs]
  -> 读取 First rects -> 重排既有 li -> 读取 Last rects -> 取消旧动画并播放 FLIP
  -> SaveCoordinator 保存快照 A
       -> 请求 A 在飞行时，用户再次排序为快照 B
       -> A 成功：若 B 未确认，发送 B；不回写 order
       -> B 失败：保留 order B，显示 alert 和 Retry
       -> Retry：重新发送 B -> 成功后显示 Saved

Hide board -> cancel animations + remove pointer listeners -> 不发布隐藏后的视觉更新
```

## 验证与演进

`npm run check` 覆盖焦点、动画中连续操作、拖拽、保存顺序/失败重试、隐藏/调整大小与减少动态效果；
实现后还应检查代码中的状态和清理责任与此文档一致。现实后续变化是新增“移到指定列”：只需将它转换为
`moveCard` 的目标索引，保存和 FLIP 合同不变；跨列 DOM 容器变化才需要扩展几何测量范围。

已执行：2026-10-19 运行 `npm run check`，6 个 Chromium 用例全部通过。成本用例记录了固定 80
张卡、8 次操作、减少动态效果下的原始浏览器指标；它是本地浏览器证据，不代表线上保存服务验收。
