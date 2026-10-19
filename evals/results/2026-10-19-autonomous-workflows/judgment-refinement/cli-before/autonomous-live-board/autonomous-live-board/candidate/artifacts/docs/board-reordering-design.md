# 看板排序技术设计

## 目标与已知约束

80 张卡片以稳定 `id` 排序。按钮和手柄拖放都立即改变同一份业务顺序；按钮操作后焦点仍在同一卡片的同一控制项。重排应保留空间连续性，但减少动态效果时直接进入终态。保存是异步的：新的本地意图不能被旧响应覆盖，失败必须保留当前顺序并可重试。隐藏看板要取消动画，不能让保存回调重新渲染页面。

已复用 `cards` 的稳定数据和 `saveOrder(ids)` API。公开的 Board 标签和 `data-card-id` 保持不变。卡片的 DOM 节点按 id 复用，避免将动画视觉状态变成第二份顺序事实。

## 实施序列（4 步）

1. 在 `src/app.mjs` 建立 `order` 作为唯一排序事实，创建一次卡片节点并按该顺序移动已有节点。`move(id, delta)` 和 `moveBefore(id, targetId)` 都返回是否发生变化；验证按钮和拖放得到相同数组。
2. 在同一模块的 `renderOrder()` 中先批量记录卡片矩形、同步提交最终 DOM 顺序、再播放 FLIP `transform` 动画。动画句柄由页面拥有；新操作、隐藏和卸载样式都会取消旧动画。验证连续操作、滚动、缩放和隐藏后没有运行中的动画。
3. 在 `SaveQueue` 中拥有保存中的快照、待发送快照和错误状态。一次请求在飞行时只保留最新待保存快照；成功后发送该快照，失败时显示警告与重试。验证旧成功响应不影响新意图，失败重试发送失败的最新快照。
4. 以按钮、键盘和原生 pointer drag 驱动上述操作；保留原生可聚焦按钮作为不依赖拖动的替代途径。执行 `npm run check`，并复查减少动态效果静态终态与浏览器成本记录。

## 契约与所有权

`order: string[]` 由应用模块拥有，是唯一业务顺序。`renderOrder(focusTarget?)` 只投影该数组到 DOM；`focusTarget` 为 `{ cardId, control }`，仅用于在渲染后恢复触发按钮的焦点。

`animateReorder(firstRects)` 只拥有过渡的 `Animation` 句柄和内联 transform 清理。其不写入 `order`；偏好减少动态效果时不创建动画。新操作先取消已有动画并提交其最终视觉样式，因此中断后继续操作不会回跳。

`SaveQueue.submit(ids)` 接收不可变顺序快照。它串行调用 `saveOrder`，且在飞行请求期间以最新快照替换待发送值；`retry()` 只重发错误中保存的快照。可见状态由队列回调写入 status/alert 区域，不控制看板可见性。

## 技术架构

```text
用户（按钮 / 键盘 / pointer drag）
                 |
                 v
      app.mjs: move / moveBefore
                 |  更新唯一 order
                 +------------------------------+
                 |                              |
                 v                              v
  renderOrder + animateReorder            SaveQueue.submit(snapshot)
        |                                      |
        v                                      v
复用的 <li data-card-id> 节点              api.mjs: saveOrder -> /api/order
        |                                      |
        v                                      v
  焦点恢复 / 可中断 FLIP                  status / alert / Retry save
```

## 数据流（一次连续按钮操作与保存失败）

```text
Move down(card 1)
  -> move("1", +1): order [1,2,3] => [2,1,3]
  -> measure First -> append existing nodes in Last order -> FLIP Play
  -> SaveQueue.submit([2,1,3]) -> POST snapshot A (in flight)

Move down(card 1) while A is pending
  -> order [2,1,3] => [2,3,1]
  -> cancel previous animation -> FLIP final DOM -> pending snapshot B
  -> A success -> POST B
  -> B failure -> preserve order [2,3,1] + alert + retry snapshot B
  -> Retry save -> POST B -> success -> status "Saved"

Hide board -> cancel all animations, detach board DOM; save completion only updates
status and never calls render/show.
```

## 验证与演进

Playwright 的现有 Board 用例覆盖身份、焦点、连续操作、拖放等价性、保存先后与重试、隐藏清理及减少动态效果。成本用例记录真实 Chromium 的布局、样式和脚本成本，不代表线上服务验收。

已执行：`npm run check`（2026-10-19）通过 6/6。固定 80 卡片、8 次按钮移动、减少动态效果条件下，Chromium 151.0.7922.34 记录为 LayoutCount 15、LayoutDuration 0.002289、RecalcStyleCount 32、RecalcStyleDuration 0.000773、ScriptDuration 0.004556、TaskDuration 0.101646；这是本地测试数据，不是线上性能承诺。

若将来需要跨列排序，保留 `moveBefore` 的目标卡片语义；调用者只需传入同一稳定 id，不需改变保存或动画所有权。
