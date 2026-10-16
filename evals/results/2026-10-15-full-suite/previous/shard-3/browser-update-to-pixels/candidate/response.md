结论：先修复布局 Effect 的读写交错，再把高频指针坐标移出看板根 state，最后才评估 `transform`、局部 `memo` 或虚拟化。这样每一步都能单独用生产构建的 Chrome trace 验证，不需要引入动画库。

工作区没有应用源码：项目文件列表为空、`HEAD` 没有 tracked files、工作树为干净的 `main`。因此本次无法提交具体 React 修改或实际跑看板，只能基于已给出的实现与 trace 事实给出可执行边界；没有改动 `.frontend-architect`。

## 成本链路

| 阶段 | 当前工作 | 判断 |
|---|---|---|
| Pointer event | 每次移动都更新看板根 state | 高频事件直接进入 React 更新链 |
| React render | 根组件及约 300 张卡片参与计算 | 已确认失效范围过大；参与 render 不等于全部 DOM 都 commit，需用 React Profiler区分 |
| Commit / Layout Effect | Effect 在浏览器绘制前同步遍历卡片 | Effect 时间直接占用输入和当前帧预算 |
| Style / Layout | 每张卡片执行 class 写入 → `getBoundingClientRect()` → `top` 写入 | class/top 写入使样式或布局失效；随后的几何读取可能强制同步 Style/Layout。下一张卡再次重复，形成 layout thrashing |
| Paint / Composite | `top` 和 class 改变影响位置、绘制区域 | `top` 通常需要 Layout 和 Paint；最终是否还能合成优化由实际样式和层决定 |
| Presentation | 主线程长任务推迟新像素提交 | 对应现有 trace 中的长任务及重复 Style、Layout、Paint |

不能仅凭描述断言恰好发生了 300 次完整布局，因为浏览器可能合并部分工作；但这种写—读—写循环具备强制同步布局条件，且生产 trace 已证明下游渲染成本真实存在。

## 最小改动顺序

### 1. 先批量读写布局

这是最局部、基本不改变状态契约的修复：

```tsx
useLayoutEffect(() => {
  const elements = getCardElements();

  // 写阶段：只改变确实需要变化的 class
  elements.forEach(applyMeasurementClass);

  // 读阶段：连续取得一个几何快照
  const rects = elements.map(element =>
    element.getBoundingClientRect()
  );

  // 纯计算阶段：不访问 DOM
  const tops = calculateTops(rects);

  // 写阶段：连续提交最终位置
  elements.forEach((element, index) => {
    element.style.top = `${tops[index]}px`;
  });
}, [cardOrder, geometryVersion]);
```

约束：

- 指针 `x/y` 不应成为这个 Effect 的依赖；只有卡片顺序、尺寸或容器几何变化才应重新测量。
- 如果后一张卡的位置确实依赖前一张刚写入的 `top`，不能机械批处理；应从同一份几何快照计算累计位置，或交给 Grid/Flex 正常流布局。
- 不要简单把 `useLayoutEffect` 改成 `useEffect`。这只可能把卡顿变成先显示错误位置再跳动，并没有消除读写交错。

目标是把每次遍历中近似 O(N) 次潜在强制布局，收敛为一次集中测量和一次集中写入。

### 2. 把指针坐标移出 React 根 state

指针坐标是每帧视觉输入，不是 300 张卡片共享的持久业务状态。建议边界：

- React state 保留：拖动中的卡片 ID、源位置、当前有效投放目标、最终排序结果。
- `ref` 保留：最新指针坐标、拖动起点、活动 DOM 引用、几何快照、待执行的 RAF ID。
- `requestAnimationFrame`：每帧至多消费一次最新坐标。
- 只有投放目标真正跨区变化时才更新 React state；开始、结束和取消仍走正常状态转换。

概念实现：

```tsx
function onPointerMove(event: React.PointerEvent) {
  latestPointer.current = { x: event.clientX, y: event.clientY };

  if (frame.current === null) {
    frame.current = requestAnimationFrame(updateDragFrame);
  }
}

function updateDragFrame() {
  frame.current = null;

  const point = latestPointer.current;
  updateDraggedVisual(point);

  const nextTarget = hitTest(point, geometrySnapshot.current);
  if (nextTarget !== currentTarget.current) {
    currentTarget.current = nextTarget;
    setDropTarget(nextTarget);
  }
}
```

拖动结束、取消或卸载时必须取消 RAF、释放 pointer capture，并清理临时样式。不要把高频 CSS 自定义属性写在会继承给整个看板的根节点上；这可能重新扩大 300 张卡片的样式失效范围。

### 3. 只优化活动视觉的位置写入

如果 trace 仍显示 `top` 引发显著 Layout，可将活动卡片或单独的拖动预览改为：

```css
.drag-preview {
  transform: translate(var(--drag-x), var(--drag-y));
}
```

只更新活动元素的 `transform`，不要默认给 300 张卡片加 `will-change` 或独立层。`transform` 通常能避开布局，但不保证没有 Style、Paint、显存或文字渲染代价，必须以 trace 验证。

如果排序预览需要其他卡片让位，只更新真正受影响的区间；长期更理想的是让正常流布局负责最终位置，而不是永久维护 300 个 `top`。

### 4. 再决定是否需要 `memo`

只有在前述修改后，React Profiler 仍显示某些昂贵卡片因无关 props/context 更新而重复 render，才对这些具体叶节点使用 `memo`。

先检查：

- 卡片是否仍收到 pointer 坐标；
- 是否每次创建新的对象、数组或回调；
- 是否订阅了包含拖动状态的大型 Context；
- `key` 是否稳定。

如果 props 本身每帧变化，给所有卡片加 `memo` 只会增加比较成本且无法跳过 render。300 个节点也不足以自动证明需要虚拟化；虚拟化还会影响拖放测量、滚动、键盘操作和可访问性，应放到后续独立证据中判断。

## 几何边界

建立一个很小的拖动几何所有者即可，不必做通用布局框架：

- 拖动开始时集中测量卡片。
- pointer move 只查询缓存，不逐卡重新读取 DOM。
- 卡片顺序、尺寸或容器尺寸改变时将快照标为 dirty，并在下一帧集中重测。
- 若拖动期间允许滚动，要么统一换算为看板坐标，要么在滚动后使快照失效。
- 一个现实的后续变化是卡片内容异步增长：届时可在该边界接入现有尺寸事件或小范围 `ResizeObserver`，无需修改 pointer 处理和卡片组件。

## 验证方案

先固定基线：同一 Chrome 版本、生产构建、机器、视口、缩放、刷新率、约 300 张相同数据的卡片，以及相同拖动路径。预热后重复多次，比较中位数和高分位，而不是挑一次最好结果。

每个改动单独采集 trace：

1. 原实现。
2. 仅批量布局读写。
3. 再移出 pointer state、加入 RAF。
4. 如有必要，再改活动元素的 `transform`。

通过条件：

- pointer move 不再导致看板根组件按事件频率 commit；React 更新只出现在拖动语义变化时。
- Layout Effect 中不存在 DOM write → geometry read 的循环。
- 稳态拖动不再出现由该交互造成的超过 50ms 主线程长任务。
- dirty frame 中的强制布局次数不再随约 300 张卡片线性增长。
- `transform` 方案启用后，活动卡片的位置更新在 trace 中不再触发 Layout；同时检查 Paint、层数和内存没有明显恶化。
- 帧表现按测试设备真实刷新率判断，不把 16ms 当作所有设备的统一应用 CPU 预算。

同时做真实浏览器行为回归：

- 卡片始终跟手且不跳位；
- 投放目标、最终顺序和取消行为正确；
- 快速移动、移出看板后释放、拖动中滚动均正确；
- 卡片尺寸变化或窗口 resize 后命中区域正确；
- 原有键盘拖放、焦点与可访问性行为不受影响。

本地 Skill 的 update-to-display 模型在这里主要影响了两个决策：先缩小状态失效范围，再消除 DOM 几何读写交错；render 次数只作为诊断证据，最终以生产浏览器中的输入响应、布局、绘制和帧表现判定。