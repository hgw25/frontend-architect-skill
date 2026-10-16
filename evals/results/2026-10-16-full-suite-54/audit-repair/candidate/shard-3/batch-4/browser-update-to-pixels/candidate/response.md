结论：卡顿是两段成本叠加，而不是单纯“React 渲染慢”。

```text
pointermove
→ 根组件 setState
→ 看板及约 300 张卡片重新计算
→ React commit
→ useLayoutEffect 写 class
→ 立即读 getBoundingClientRect，强制 Style/Layout
→ 写 top
→ 下一张卡再次触发布局刷新
→ Layout + Paint，主线程长任务，错过帧
```

工作区没有应用源码，只有 `.frontend-architect` 指引，因此本次没有可实施或验证的代码改动。下面是可直接落地的最小改动顺序。

## 1. 先消除读写交错

这是最小、且与 trace 证据最直接对应的改动。

把：

```ts
cards.forEach(card => {
  card.classList.toggle('dragging', condition);
  const rect = card.getBoundingClientRect();
  card.style.top = calculateTop(rect);
});
```

改成明确的三个阶段：

```ts
// 1. 所有会影响样式或几何的写操作
cards.forEach(applyRequiredClasses);

// 2. 集中读取；至多触发一次同步布局
const rects = cards.map(readRect);
const updates = calculatePositions(rects);

// 3. 集中写入
updates.forEach(applyPosition);
```

若 class 只表达拖动状态，应只在 drag start/end 修改，而不是每次指针移动都重复修改。

这一阶段的验收信号是：trace 中不再出现近似“每张卡一次”的 `Style → Layout → Style → Layout` 锯齿。仍遍历 300 张卡并不理想，但一次批量布局远好于数百次强制布局。

## 2. 几何测量移出逐帧 Effect

卡片矩形通常不需要在每个像素移动时重新读取。建立一次拖动会话级缓存：

- drag start 时批量测量卡片。
- pointer move 只用缓存做碰撞和位移计算。
- 仅在真正影响几何时失效：容器滚动、窗口或容器 resize、卡片增删、卡片尺寸变化、列折叠等。
- 如果滚动只造成统一坐标偏移，优先修正偏移量，不重新测量全部卡片。
- drop、cancel、失去 pointer capture、组件卸载时清理缓存及调度任务。

为未来常见的“卡片高度变化”保留一个明确的 `invalidateGeometry(reason)` 入口即可，不需要建设通用布局引擎。

## 3. 原始指针位置退出根组件 state

职责边界应当是：

- React state：拖动卡片 ID、来源、当前目标、最终排序等语义状态。
- `ref`：最新的原始指针坐标。
- `requestAnimationFrame`：每个显示帧最多应用一次视觉更新。
- 卡片组件：渲染卡片数据，不订阅原始坐标。
- 几何控制器或局部 hook：拥有测量缓存、rAF、事件监听和清理。

核心形态如下：

```ts
const pointerRef = useRef({ x: 0, y: 0 });
const frameRef = useRef<number | null>(null);

function onPointerMove(event: PointerEvent) {
  pointerRef.current = { x: event.clientX, y: event.clientY };

  if (frameRef.current !== null) return;

  frameRef.current = requestAnimationFrame(() => {
    frameRef.current = null;

    const point = pointerRef.current;
    updateDraggedVisual(point);

    const nextTarget = hitTest(point, geometryCache);
    setDropTarget(current =>
      current === nextTarget ? current : nextTarget
    );
  });
}
```

这里仍允许在目标卡片真正变化时更新 React state；禁止的是“每个指针采样都让整个看板更新”。

如果重构风险需要分阶段，先给现有 `setState` 加 rAF 合帧也能限制更新频率，但它只是过渡措施：每帧仍可能重新计算 300 张卡片。

## 4. 再处理 `top` 引起的像素成本

批量写 `top` 仍可能让浏览器对大量元素做布局和绘制。若视觉语义允许，拖动预览和受影响卡片优先使用：

```css
transform: translate3d(0, var(--drag-offset-y), 0);
```

这通常能把工作从布局移向合成，但不能先验宣称“一定只走 GPU”。需要核对：

- 是否改变定位、命中测试或堆叠上下文语义；
- 是否产生过多合成层；
- 阴影、滤镜、大面积内容是否仍造成 Paint；
- 文字清晰度和缩放行为；
- 最终 drop 后是否正确清除 transform，并只提交一次真实顺序。

不要给全部 300 张卡长期设置 `will-change`。只对当前拖动项或少量实际移动项使用，并在结束时移除。

## 5. 最后才考虑局部 memo 或虚拟化

不应默认给所有组件加 `memo`。完成状态隔离后，多数卡片本来就不该因指针移动而更新。

只有 React Profiler 仍证明某类卡片存在显著重复计算时，才：

- 对该组件局部使用 `memo`；
- 先确保 props、key 和回调身份稳定；
- 不写会忽略真实属性变化的自定义比较器。

虚拟化也不是首选。300 张轻量卡片通常应先解决失效范围和布局抖动；只有在节点数量、卡片复杂度或 trace 仍证明挂载成本显著时，才引入虚拟化，并同时解决变高卡片、拖动跨视口、焦点和无障碍遍历问题。

## 验证方案

使用相同生产构建、相同 300 张代表性卡片、相同 Chrome 版本和设备，记录改动前后多次拖动。保存中位数及较差样本，不用一次录制下结论。

重点比较：

| 边界 | 应观察的证据 |
|---|---|
| 输入到 React | 原始 pointer move 不再对应根组件 commit；语义目标未变化时不 setState |
| React 计算 | 看板和卡片 commit 次数、commit 耗时明显下降 |
| DOM 到布局 | 没有逐卡读写交错；每帧同步布局次数从近似 O(n) 降至 O(1) |
| 布局到像素 | Layout、Paint 总耗时和最长任务下降；呈现帧更连续 |
| 工作量约束 | 每帧至多一个 rAF；整表测量只发生在 drag start 或明确失效事件 |

建议工具：

- Chrome Performance：Main、Interactions、Rendering、Screenshots、Paint。
- React Profiler：确认具体更新原因和 commit 范围；它是中间证据，不单独证明流畅。
- `performance.mark/measure`：标记拖动处理、测量阶段和写入阶段。
- Paint flashing / Layers：验证 transform 是否真的减少 Paint，以及是否产生过多层。

验收不应硬编码“所有设备都低于 16ms”，而应按目标设备刷新率和帧证据制定。至少要求：

- 不再有与卡片数量线性对应的强制同步布局。
- 原始坐标变化不会使 300 张卡片参与 React 更新。
- 长任务、Layout 和 Paint 相比同场景基线明确下降。
- 拖动位置、跨列排序、滚动中拖动、drop/cancel 行为保持正确。

还要回归窗口 resize、容器滚动、变高卡片、拖动期间数据变化、pointer capture 丢失、卸载清理，以及键盘拖动、焦点与读屏提示。键盘和无障碍状态应走语义状态，不依赖仅用于视觉更新的坐标 `ref`。