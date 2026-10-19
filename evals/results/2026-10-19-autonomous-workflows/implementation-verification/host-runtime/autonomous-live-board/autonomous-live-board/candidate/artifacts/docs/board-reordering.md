# 看板卡片排序技术设计

## 目标与约束

用户通过卡片按钮或拖拽手柄改变同一个业务顺序。每次有效操作立即更新 DOM 顺序并保存；动画只解释新旧位置，不是第二份排序状态。连续输入、滚动、窗口调整和看板隐藏不能让卡片跳回旧位置或留下动画。保存按提交顺序串行，最终持久化最新顺序，失败可见并可重试。保留稳定的卡片 DOM 身份、`data-card-id`、Board 列表标记和按钮焦点。

## 依赖顺序与验收

共 4 个按依赖排序的步骤：

1. **建立稳定视图。** `createBoard()` 为每个稳定 ID 创建一次 `li`，控件事件把按钮与拖拽意图交给排序入口；`setBoardVisible()` 只挂载或卸载列表。验收：80 张卡片存在，隐藏后可恢复同一业务顺序，按钮操作后焦点仍在同一卡片的同一按钮上。
2. **统一排序事务。** `moveByOffset(id, delta)` 与 `moveToIndex(id, targetIndex)` 仅计算有效目标，最终都调用 `commitOrder(nextOrder)`。后者原子更新唯一 `order`、重排现有节点、启动空间过渡并请求保存。验收：按钮和拖拽得到相同顺序，边界移动不产生保存。
3. **解释空间变化。** `capturePositions()` 批量读取可见卡片几何，`animateFrom(previousPositions)` 在 DOM 已到最终顺序后执行只含位移的 FLIP。每个元素最多一个动画；新操作先采样当前视觉几何并取消旧动画，再从该位置过渡到新终态。隐藏、resize 和减少动态效果会取消并清理动画。验收：中间帧确实移动，连续操作不会跳回过时位置，销毁后无运行动画。
4. **协调持久化。** `requestSave()` 将当前顺序快照标记为待保存；`flushSave()` 始终只有一个请求在途，成功后若已有新快照则继续保存，失败保留最新快照并显示 `Retry save`。旧请求只能确认自己的快照，不能清除后来意图。验收：快速连续修改最终提交最新顺序，失败可见，重试提交最新待保存值，成功显示 Saved。

## 架构与责任

```text
DOM controls / pointer events
            |
            v
  reorder intent functions
            |
            v
  commitOrder(nextOrder) -----> save coordinator -----> saveOrder(ids)
       |                              |
       v                              v
single order state              status / retry UI
       |
       v
stable board DOM + FLIP owner
```

页面模块拥有短生命周期 UI 资源（拖拽状态、动画句柄、resize 清理），保存协调器拥有请求顺序与失败恢复。服务响应不携带可替换本地顺序的权威版本，因此客户端采用串行写入，避免较旧请求晚到覆盖较新意图。

## 数据流

```text
button offset OR pointer target
             |
             v
       next ID array
             |
       [commit once]
        /          \
       v            v
reorder existing   pending snapshot
DOM nodes          (copy of IDs)
   |                    |
final layout        serialized POST
   |                    |
current visual -> FLIP  +--> success -> save newer pending snapshot
geometry -> animation   `--> failure -> alert + Retry save
```

## 关键选择与变化检查

- CSS 不能在网格重排后直接过渡布局位置，因此使用 FLIP；只动画 `transform`，真实 DOM 在动画前已是终态。80 个元素的几何读取在每次有效排序时批量完成，避免逐项读写交错。
- 指针拖拽采用 Pointer Events 和命中卡片目标，不引入新依赖；未来加入触摸或拖到首尾仍复用 `moveToIndex`，只需扩展目标索引计算。
- 当前保存 API 没有版本或服务端顺序回读，串行写是能保证本客户端提交顺序的最小策略；未来 API 若提供版本，只需替换保存协调器，不影响排序和视图。
- 卡片数据当前静态且稳定。若以后允许增删卡片，应在稳定视图所有者中增加按 ID 的节点对账，排序事务与保存契约无需改变。

## 验证

在真实 Chromium 中覆盖：按钮排序的 DOM 身份、焦点和中间帧；连续输入后的最终顺序；拖拽等价性；乱序风险下的串行保存、失败与重试；resize/scroll/隐藏后的清理；减少动态效果；固定 80 卡片连续操作的浏览器成本记录。
