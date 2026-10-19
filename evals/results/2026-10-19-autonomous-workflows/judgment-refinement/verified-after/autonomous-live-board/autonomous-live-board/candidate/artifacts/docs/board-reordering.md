# 看板卡片排序技术设计

## 目标与已知事实

本次交付使 80 张固定 ID 的卡片可以通过上下按钮或拖动手柄排序。一次操作必须立即反映
在页面的唯一顺序事实中；保存服务只接收该顺序的快照。后续操作可在保存和动画期间继续，
失败需要可见提示和重试。`Board` 的可访问名称和每张卡的 `data-card-id` 是既有公开标记，
Hide/Show 需要能安全处置进行中的动画和请求回调。

已检查的事实：`src/data.mjs` 提供稳定卡片数据，`src/api.mjs` 已封装 `saveOrder(ids)`；
当前实现每次排序都会销毁所有 DOM 节点，且在每个卡片写入后读取布局。浏览器测试已覆盖
键盘焦点、拖动、快速重复操作、保存失败、隐藏和减少动态效果。

## 实施序列

共 4 个有依赖的步骤：

1. 在 `src/app.mjs` 建立 `order` 作为唯一业务顺序，按该顺序复用/移动卡片节点；验收：按钮
   和拖动后公开 ID 顺序正确，焦点仍在同一张卡的操作按钮上。
2. 为节点重排接入 FLIP：批量读取重排前后的矩形，DOM 先到最终位置，再从旧视觉位置变换至
   新位置；新操作先以当前视觉矩形为下一次 First，取消旧动画。验收：连续操作中卡片不跳回
   旧位置，减少动态效果时直接到静态终态。
3. 由 `requestSave`/`startNextSave` 拥有保存队列：同一时刻只发送一个快照，新的顺序取代尚未
   发送的快照；失败保留最新未确认快照供 `retrySave` 重发。验收：旧确认不覆盖新意图，失败
   后 Retry 发出最新顺序。
4. Hide 时由看板视图所有者取消动画并移除列表；请求结果只更新仍存在的状态元素。验收：隐藏、
   调整窗口和滚动后无运行中的动画或幽灵列表，重新显示使用当前顺序。

## 契约与职责

- `moveCard(id, targetIndex)`：`id` 是 `order` 中的卡片 ID，目标为最终数组插入索引；边界外或
  无变化时不产生副作用。它更新 `order`、调用 `renderBoard`，并把不可变顺序快照交给
  `requestSave`。
- `renderBoard()`：列表 DOM 和其 FLIP 动画的所有者。卡片节点由 ID 缓存并复用，因而浏览器能
  保留已聚焦按钮。动画只表达 DOM 已完成的最终排序，不保存业务状态。
- `requestSave(snapshot)`、`startNextSave()`、`retrySave()`：保存传输状态的所有者。`queuedSave`
  永远是最新待发送快照；`activeSave` 的响应不能改写当前 `order`；`failedSave` 是 Retry 的唯一
  来源。
- 拖动手柄以 Pointer Events 在 pointer up 时计算目标卡片，并复用 `moveCard`，不另设拖动顺序。
  上下按钮是非拖动的单指针/键盘替代路径。

## 技术架构

```text
[Move up/down buttons] ----\
                          -> moveCard -> order (唯一真相) -> renderBoard
[Pointer drag handle] ----/                                  |       |
                                                             |       +--> keyed <li> DOM
                                                             |                -> FLIP WAAPI
                                                             v
                                                     requestSave snapshot
                                                             |
                                                       saveOrder (HTTP)
                                                             |
                                                  status / alert / Retry button
```

## 数据流

```text
用户按下 "Move down"（或拖动手柄）
  -> moveCard("1", 新索引)
  -> order: ["2", "1", ...]
  -> renderBoard: 读取旧视觉 rect -> 重新排列复用的 <li> -> 读取新 rect
       -> cancel 旧动画 -> 从旧 rect 到新 rect 播放 transform（reduce: 不播放）
  -> requestSave([...order]) -> queuedSave
  -> startNextSave -> POST /api/order { ids }
       -> 成功：若 queuedSave 存在，发送其最新快照；否则显示 Saved
       -> 失败：failedSave = queuedSave ?? activeSave，显示 alert + Retry
  -> Retry -> queuedSave = failedSave -> POST 最新失败快照
```

## 验证与演进

运行 `npm run check` 验证实际 Chromium 中的排序、拖动、焦点、保存恢复、隐藏清理、减少动态效果
及固定交互成本记录。一个现实的后续变化是增加“移到列首/列尾”：它只需把目标索引交给
`moveCard`，不需要复制动画或保存策略。
