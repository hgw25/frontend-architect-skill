结论：先修复读写交错，再限制每帧执行次数，随后把指针坐标移出根组件 state。`memo`、虚拟化和动画库都不应作为第一步。

工作区中只有 `.frontend-architect` 和 `.git`，没有 React 源码、配置或测试，因此本轮无法提交实现 diff；以下方案严格基于题述 trace，不假设具体组件结构或 React 版本。

## 成本链路

```text
pointermove
  → 根组件 setState
  → 看板及约 300 张卡片参与 React render
  → DOM commit
  → useLayoutEffect
      → 修改 card A class
      → 读取 A.getBoundingClientRect()，同步刷新 Style/Layout
      → 写 A.top，使布局再次失效
      → 对 card B 重复……
  → Paint / Raster
  → Composite / 屏幕显示
```

这里有两类独立成本：

1. **React 失效范围过大**

   每次指针移动都更新根 state，使整棵卡片子树参与计算。参与 render 不等于所有 DOM 都实际修改，但 300 张卡片的组件计算、props 比较和 Effect 调度仍发生在主线程上。

2. **强制同步布局**

   `class 写入 → getBoundingClientRect 读取 → top 写入` 在循环中交错。读取几何信息时，浏览器必须先结清之前积累的样式和布局变化；随后写 `top` 又使下一次读取可能重新触发布局。`useLayoutEffect` 还发生在绘制前，会直接延迟下一帧。

最终 Paint 高不一定全来自 React：修改大量 `class`、`top` 可能扩大失效区域，即使 React render 已经很快，浏览器阶段仍可能卡顿。

## 最小改动顺序

每一步都重新执行同一拖动场景；达到性能目标即可停止，避免一次性重构。

### 1. 先把几何读写分阶段

这是最局部、风险最低的修复。

- 如果 `class` 会改变尺寸，先一次性给所有节点设置 class。
- 再集中读取全部 `getBoundingClientRect()`。
- 在纯 JavaScript 中计算位置。
- 最后集中写入 `top` 或其他视觉属性。
- 如果 class 不影响尺寸，则所有读取都应放在任何 DOM 写入之前。

```js
// Phase 1：必要的测量准备写入
for (const card of cards) {
  applyMeasurementClass(card);
}

// Phase 2：只读；第一次读取最多结清前面的统一变更
const rects = cards.map(card => card.getBoundingClientRect());

// Phase 3：不访问 DOM
const positions = calculatePositions(rects, pointer);

// Phase 4：只写
for (let index = 0; index < cards.length; index += 1) {
  cards[index].style.top = `${positions[index]}px`;
}
```

验收重点不是循环更快，而是 trace 中不再出现每张卡片一次的 `Style → Layout → Style → Layout` 交替。

### 2. 用 `requestAnimationFrame` 合并高频 pointermove

指针事件可能快于屏幕刷新率。事件处理器只记录最新坐标，每个显示帧最多调度一次更新：

```js
function onPointerMove(event) {
  latestPointer.current = {
    x: event.clientX,
    y: event.clientY,
  };

  if (frameId.current == null) {
    frameId.current = requestAnimationFrame(flushDragFrame);
  }
}

function flushDragFrame() {
  frameId.current = null;
  const pointer = latestPointer.current;

  // 所有读取在所有写入之前
  const frame = deriveDragFrame(pointer);
  applyDragFrame(frame);
}
```

在 `pointerup`、`pointercancel` 和卸载时取消尚未执行的帧。这里的 rAF 是合并和对齐显示帧，不是把同样的重活藏进动画回调。

### 3. 把逐像素坐标移出看板根 state

建议边界：

| 所有者 | 内容 |
|---|---|
| React 看板状态 | 卡片数据、稳定顺序、拖动卡片 ID、最终落点 |
| 拖动控制器/ref | 最新指针坐标、rAF ID、缓存几何、当前视觉偏移 |
| React 低频更新 | `draggingId`、跨越到新的目标卡片时的 `overId`、最终 drop |
| DOM/CSS 写入 | 当前拖动卡片及确实需要位移的卡片 |

纯坐标变化不再触发根组件更新。目标卡片只有在指针跨过边界时才变化，因此可以保留为 React 状态；drop 时再提交一次正式排序。

不要让 React 和拖动控制器同时写同一个 `transform` 或 `top`。拖动期间由控制器拥有临时样式，结束时清理临时样式并由 React 提交最终状态。

### 4. 缓存布局，只在几何失效时重新测量

在拖动开始时批量测量卡片，后续帧用缓存矩形做纯 JS 命中测试。以下情况才标记缓存失效：

- 容器或卡片尺寸改变；
- 内容导致卡片高度改变；
- 看板滚动；
- viewport resize；
- 列结构发生变化。

下一帧先统一重新读取，再执行视觉写入。对于可变高度卡片，可让稳定的外层 slot 负责布局和测量，内层视觉卡片负责 transform，避免测到已经变换后的矩形。

### 5. 减少会触发布局和绘制的写入

在不改变交互语义的前提下：

- 拖动中的卡片优先使用 `transform: translate(...)`；
- 只有越过排序边界时，才更新受影响卡片的位移；
- 最终 drop 再修改真实 DOM 顺序；
- 不给 300 张卡片统一加 `will-change` 或永久图层；
- 用 trace 验证 transform 是否确实减少 Layout/Paint，并检查图层数量和显存，不把“走合成层”当作免费优化。

如果业务要求拖动期间 DOM 顺序立即改变，应保留这一语义，只减少更新频率和受影响节点，不能用视觉位移悄悄改变可访问性或键盘行为。

### 6. 最后才考虑定向 memo 或虚拟化

只有 React Profiler 证明低频的 `overId` 更新仍使卡片执行昂贵 render，且 props 身份稳定时，才对具体卡片边界使用 `memo` 或更窄的订阅。

300 张卡片是否需要虚拟化要由 mounted DOM、布局和绘制数据决定；还必须处理可变高度、滚动、焦点、键盘拖动和屏幕阅读器遍历，因此不属于首轮修复。

## 推荐的最终执行边界

```text
Pointer handler
  └─ 记录最新坐标、申请一帧

Drag frame controller
  ├─ 几何脏时批量读取
  ├─ 纯函数计算命中与位移
  └─ 批量写视觉属性

React board
  ├─ 拖动开始/结束
  ├─ 目标卡片发生语义变化
  └─ drop 时提交正式顺序
```

这也能应对一个现实后续变化：卡片改成可变高度时，只需调整几何测量和失效策略，不必重新把逐像素状态塞回整个 React 树。

## 验证方案

固定生产构建、Chrome 版本、设备档位、刷新率、viewport 和同一组 300 张代表性卡片，录制相同轨迹的拖动。每项修改前后至少重复多次，比较中位数及尾部表现。

主要验收：

- 坐标单独变化时，看板根组件不再 commit；
- 每个显示帧最多执行一次拖动更新；
- 稳态拖动帧不调用 `getBoundingClientRect()`；仅开始或几何失效时批量读取；
- trace 中不再出现卡片循环导致的反复 Style/Layout；
- 拖动产生的长任务消失，尤其是超过 50ms 的任务；
- 指针事件到对应呈现帧的延迟和丢帧明显下降；
- Layout、Paint 总耗时和 Paint 区域下降；
- 没有因大量合成层带来内存或 GPU 回退。

Render 次数、DOM 写入次数可以作为定位指标，但不能代替真实浏览器中的输入到像素结果。

功能回归应覆盖：

- 开始拖动、跨列/跨卡片、drop；
- Escape、`pointercancel`、拖出窗口、组件卸载；
- 拖动中滚动和 resize；
- 可变高度卡片；
- 快速往返越过目标边界；
- 键盘拖动、焦点保持和必要的可访问性播报。

可在 CI 中增加确定性的工作量约束，例如“普通 pointermove 不测量列表”“每帧最多一个调度”，但不要把本机毫秒数设成脆弱的通用阈值。最终性能结论仍应来自生产构建的真实 Chrome trace。

本地 Skill 的指导使验收落在完整的“状态更新到最终像素”链路，而不是仅以 React render 数量宣告成功。此次未修改任何文件，工作树保持干净。