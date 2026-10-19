# 看板卡片排序设计

## 范围与事实

目标是让 80 张具有稳定 ID 的卡片可通过上下按钮或拖动排序，并在连续操作中保持业务顺序、焦点和空间连续性。现有 `src/data.mjs` 是卡片内容的唯一来源，`src/api.mjs` 的 `saveOrder(ids)` 是持久化边界。`Board` 列表和 `data-card-id` 是公开 DOM 标记，必须保留。

排序的唯一事实是内存中的 `order` ID 数组；DOM 只投影该数组。每次意图立即更新数组和 DOM。保存采用单飞请求：正在保存时新意图标记为待同步，当前请求结束后只发送最新快照。最近快照保存失败时显示警告和重试；过期成功响应不改变界面或顺序。隐藏看板会销毁当前 DOM、取消动画，保存结果不得重新创建看板。

视觉连续性采用 FLIP：变更前读取所有卡片矩形，按新顺序重新插入同一批节点，变更后读取矩形，再以 `transform` 反转并用 Web Animations API 播放到终态。DOM 在动画前已是正确业务终态。新操作会取消旧动画、清理内联样式，再从当前几何开始新的过渡；减少动态效果时跳过动画。读写各自批量进行，避免现有逐项写后读的布局抖动。

## 实现步骤（4 个）

1. `src/app.mjs` 建立稳定卡片节点和 `applyOrder(order, { animate })`；复用节点并维护按钮焦点。完成条件：按钮连续操作后的公开 ID 顺序和焦点都正确。
2. 在同一所有者中加入指针拖动手柄及命中卡片的目标索引计算。完成条件：将卡片 1 拖到卡片 3 后顺序为 `2,3,1`，非拖动点击不排序。
3. 在 `src/app.mjs` 中实现单飞、最新快照保存与可见重试状态。完成条件：第二次操作不会被第一次响应回滚，失败可重试相同快照。
4. 管理动画生命周期和减少动态效果分支，并运行浏览器验收与成本采样。完成条件：隐藏、缩放、滚动和减少动态效果下无运行中动画或幽灵 DOM。

## 契约与所有权

| 模块 / 操作 | 输入与结果 | 所有权 |
| --- | --- | --- |
| `moveCard(id, targetIndex)` | 稳定 ID 和目标索引；就地更新唯一 `order` 后投影 DOM | 看板业务顺序、排序边界、保存通知 |
| `applyOrder({ animate })` | 当前 `order`；无返回 | 卡片节点的 FLIP 测量、动画取消与清理 |
| `requestSave()` | 当前顺序快照；无返回 | 单飞请求、最新待保存快照、成功/失败提示 |
| `saveOrder(ids)` | ID 数组，解析服务 JSON 或抛错 | API 模块，复用既有 HTTP 契约 |

不新增抽象层：所有状态只服务于这个单页面看板并共享同一生命周期。若以后增加列，`moveCard` 的目标可从索引扩展为 `{ columnId, index }`，而持久化与 FLIP 投影边界仍保持不变。

## 架构

```text
Pointer / keyboard button
        |
        v
  Board controller (src/app.mjs)
  - order + card node map
  - moveCard / applyOrder (FLIP)
  - save coordinator
     |                  |
     v                  v
  DOM Board        saveOrder(ids)
  cards + status        |
                       v
                  POST /api/order
```

## 数据流

```text
Move down / drag handle
  -> moveCard(id, index)
  -> update order [single source of truth]
  -> applyOrder: First rects -> reorder DOM -> Last rects -> transform animation
  -> requestSave(snapshot)
       -> POST /api/order
       -> success: status "Saved" if snapshot is current
       -> failure: alert + Retry save(snapshot)

New intent during save
  -> replaces pending snapshot
  -> current response settles
  -> starts request for only the newest pending snapshot
```

## 验证与演进

`npm run check` 是决定性浏览器验收，覆盖连续按钮、拖动、保存顺序、失败重试、动画清理与减少动态效果，并输出 Chromium 的固定操作成本样本。改动前的首次运行因本地缺少 `playwright` 可执行文件受阻；安装锁定依赖后，使用完全相同的脚本获得改动后样本。最终运行于 Chromium 151，6/6 通过；固定 8 次排序、减少动态效果下，`LayoutCount` 为 23，`LayoutDuration` 为 0.007367 秒。初始可运行基线在同一场景为 655 次布局、0.020423 秒，说明已移除逐卡写后读造成的布局抖动。该样本仅说明测试替身下的浏览器工作，不能推断线上 API 性能。
