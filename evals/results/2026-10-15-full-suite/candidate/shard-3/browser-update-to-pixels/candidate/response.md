结论：这里有两个独立且会叠加的主线程瓶颈——根组件高频 state 扩大了 React 失效范围；Effect 中交错 DOM 写入与几何读取造成布局抖动。应分别收敛，先做局部、可测、可回退的改动，不应先铺满 `memo`，也不需要引入动画库。

工作区中没有 React 源码、依赖清单或测试入口，只有 `.frontend-architect` 与 `.git`，因此本次未修改文件，也无法实际复跑 Chrome trace。以下结论以题述生产 trace 为现有证据；具体耗时占比仍需在真实项目验证。

## 从状态到像素的成本

| 阶段 | 当前成本 | 判断 |
| --- | --- | --- |
| `pointermove` | 事件频率可能高于屏幕刷新率，每次都写根 state | 多次更新可能挤进一个显示帧 |
| React 调度与 render | 看板根组件更新，使约 300 张卡片参与 render/reconcile | 即使最终 DOM 没变化，JS 计算仍已发生 |
| DOM commit | class、style 或列表状态提交到 DOM | 引发样式失效 |
| `useLayoutEffect` | 在浏览器绘制前同步执行；遍历全部卡片 | Effect 完成前不能呈现下一帧 |
| `classList` 写入 | 使样式计算失效 | 后续几何读取可能要求同步刷新样式 |
| `getBoundingClientRect()` | 为返回准确几何信息，可能强制 Style/Layout | 它夹在写操作之间，是强制布局热点 |
| `top` 写入 | 再次使布局失效，通常还影响 Paint | 下一张卡片的读取可能再次强制布局 |
| Paint/Composite | 大面积或多元素重绘，最后合成到屏幕 | 与 trace 中反复 Style、Layout、Paint 相符 |

当前循环相当于：

```text
卡片 1：写 class → 强制布局读取 → 写 top
卡片 2：写 class → 再次强制布局读取 → 写 top
...
```

浏览器有优化空间，因此不能断言恰好发生 300 次 Layout，但代码提供了接近“每项一次同步 flush”的机会。生产 trace 已足以把它列为首要确认对象。

## 最小改动顺序

### 1. 先把 Effect 改成分阶段批处理

不改变拖动状态模型，只调整同一个 Effect 内的执行顺序：

```text
收集节点
→ 批量写入所有 class
→ 批量读取所有 rect
→ 在纯 JS 中计算位置
→ 批量写入所有位置
```

示意：

```js
const nodes = cardIds.map(id => cardRefs.current.get(id));

// Write phase
for (const node of nodes) {
  node.classList.toggle("dragging", shouldMark(node));
}

// Read phase: the first read may flush layout, later reads see a clean tree
const rects = nodes.map(node => node.getBoundingClientRect());

// Pure computation
const positions = calculatePositions(rects);

// Write phase
for (let index = 0; index < nodes.length; index += 1) {
  nodes[index].style.top = `${positions[index]}px`;
}
```

这不能消除最终布局和绘制，但应把循环中的反复强制布局压缩为少数几个阶段。不要在读取循环里偷偷写 class、style 或会改变几何的属性。

如果 class 会改变卡片尺寸，这个顺序仍成立：先统一应用 class，然后第一次几何读取触发一次新的布局；不要逐卡片写后立即读。

### 2. 不要在每次指针移动时重新测量全部卡片

在拖动开始时建立一次几何快照；稳态 `pointermove` 只做命中计算和视觉位置更新。

几何缓存只在真实布局变化时失效，例如：

- 拖动开始；
- 占位位置或卡片顺序改变；
- 看板滚动或自动滚动；
- 容器尺寸改变；
- 拖动期间确实会变化的卡片高度或内容。

建议由一个布局协调者集中提供 `measure()` / `invalidateGeometry()`，不要让 300 个 Card 分别拥有测量 Effect。若卡片高度在拖动期间不会异步变化，不必为了假想风险立即加入 `ResizeObserver`。

### 3. 把瞬时指针坐标移出看板根 state

React state 保留语义状态：

```text
activeCardId
dragging / idle
dropTargetId
最终卡片顺序
```

每帧变化但无需参与声明式渲染的坐标由拖动视觉控制器持有：

```js
const latestPointerRef = useRef({ x: 0, y: 0 });
const frameRef = useRef(null);

function onPointerMove(event) {
  latestPointerRef.current = {
    x: event.clientX,
    y: event.clientY,
  };

  if (frameRef.current === null) {
    frameRef.current = requestAnimationFrame(flushDragVisual);
  }
}
```

`flushDragVisual` 每帧最多运行一次，负责：

- 更新当前拖动元素的位置；
- 使用缓存的矩形计算命中目标；
- 仅当 `dropTargetId` 真正变化时更新 React state。

这样，指针移动不再使根组件和 300 张卡片逐事件参与更新。最终 drop 时再一次性提交列表顺序。

如果项目已有 DragLayer，应把局部 state 放入 DragLayer；如果拖动的是原卡片，则使用一个小型 `useDragVisual`/拖动控制器管理 DOM ref 和 `requestAnimationFrame`。不必为此引入新的全局 store，也不要通过会让所有 Card 订阅坐标的 Context 搬运问题。

控制器必须在 `pointerup`、`pointercancel`、丢失 pointer capture 和卸载时取消未执行的 animation frame、清除临时样式并结束拖动会话。

### 4. 仅对瞬时视觉移动评估 `transform`

若 `top` 只是拖动中的视觉位移，而不是必须参与文档流的布局事实，可改为：

```js
activeNode.style.transform = `translate(${dx}px, ${dy}px)`;
```

`transform` 通常不会触发布局，并可能只进入合成阶段，但不是无条件免费的：

- 仍可能发生 Paint 或创建额外图层；
- 变换后的 `getBoundingClientRect()` 会反映视觉位置，不能和原始布局矩形混用；
- 命中测试、滚动、占位和最终 DOM 顺序必须保持正确；
- 不要给全部 300 张卡片永久设置 `will-change`；如确有收益，只在活跃拖动元素上临时使用并在结束时移除。

若 `top` 确实表达卡片布局位置，则先保留它并完成读写批处理；不能为了 trace 好看改变布局语义。

### 5. 最后才考虑定点 `memo`

完成上述改动后再看 React Profiler：

- 如果稳态拖动只更新 DragLayer/活跃卡片，就没有理由给所有 Card 加 `memo`。
- 如果 `dropTargetId` 变化仍使昂贵且 props 未变的 Card render，才对该 Card 使用 `React.memo`。
- 同时检查 props 是否每次重建对象、数组或闭包；只稳定真正导致缓存失效的输入。
- render 数量下降只是中间证据，不能替代浏览器帧和交互结果。

虚拟化、CSS containment 或更大的列表架构调整也应后置。只有批处理和状态收敛后，300 个已挂载节点的剩余 Layout/Paint 仍被 trace 证明为主要瓶颈时才值得引入。

## 实现边界

建议把责任固定为三层：

- 看板模型：拥有卡片数据、稳定 ID、顺序、拖动生命周期和最终 drop 结果。
- 拖动视觉控制器：拥有最新指针坐标、单个 animation frame、活跃 DOM 节点和临时视觉样式。
- 布局协调者：集中测量卡片、缓存矩形、处理明确的失效事件和命中计算。

Card 本身不订阅每帧坐标，也不各自执行全局测量。一次现实的后续变化——例如可变高度卡片加自动滚动——只应扩展布局协调者的失效条件，而不需要重新让根组件广播每个指针位置。

## 验证方案

先固定同一条基线旅程：

- 相同生产构建、Chrome 版本、机器或设备档位、刷新率；
- 固定 300 张代表性卡片及相同视口；
- 执行相同长度的快速横向、纵向和折返拖动；
- 预热后多次采样，比较中位数及较差样本，不用单次最好结果。

每个改动独立采集 Chrome Performance trace，核对：

1. `pointermove` 调用栈中是否仍有根组件更新和全部 Card render。
2. Effect 调用栈中是否仍交错出现 DOM write 与强制 `getBoundingClientRect()`。
3. 单帧内 Style/Layout 次数和总耗时是否下降。
4. 长任务数量、最长任务及主线程占用是否下降。
5. Paint 面积和耗时是否下降；改用 transform 后检查图层数量与显存代价。
6. 固定拖动旅程中的掉帧或超出目标设备帧期限的帧是否明显减少。

验收不应机械写成“所有帧小于 16 ms”，而应按目标设备刷新率和实际 trace 设预算。最低通过条件应是：

- 稳态指针帧不再测量全部卡片；
- 同一循环中不再逐卡片写—读—写；
- Card render 次数不再随指针事件数和卡片总数同时增长；
- 拖动相关调用栈中不再出现长任务，或已降到预先约定的可接受范围；
- 用户可见的拖动、命中、占位与 drop 结果无回归。

还要在真实浏览器覆盖：

- 快速移动、拖出看板、取消和中断；
- 滚动与自动滚动期间拖动；
- 可变高度卡片、窗口 resize；
- 鼠标、触控笔及项目支持的触摸路径；
- 键盘拖放、焦点与提示语义不受视觉优化影响；
- drop 或 cancel 后没有位置跳变、残留 class、transform 或未取消的 animation frame。

当前未执行这些验证，因为工作区没有应用代码或可运行项目；Git 工作区保持干净。