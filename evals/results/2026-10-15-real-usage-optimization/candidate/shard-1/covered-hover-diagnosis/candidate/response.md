结论：现在不应替换 Tooltip。现有证据更支持“本地布局元素覆盖了按钮，导致真实指针无法命中”，但尚不能把它写成已确认根因。

理由：

- `button.dispatchEvent(...)` 直接把事件送到按钮，绕过了浏览器的几何命中测试、层叠和 `pointer-events`，因此测试通过只能证明按钮收到事件后能处理。
- 透明元素仍会参与指针命中；分组标题配合负 margin，确实可能覆盖最后一个按钮。
- 同版本上游 demo 正常，降低了 Tooltip 底层实现普遍失效的概率。
- 仍需排除本地 Tooltip/Dropdown trigger 组合、事件合并、ref 转发，以及浮层已经打开但被裁剪/遮挡等问题。

当前工作区没有应用源码或运行配置，只有任务指定的 Skill，因此无法核对具体 DOM、CSS 或测试实现；以下是建议在实际应用中执行的决策流程。

## 下一步调查

按信号链逐段定位，不要先换组件：

1. 复现折叠侧栏状态，在按钮可见区域的中心和上下边缘运行：

```js
document.elementsFromPoint(x, y)
```

同时在 Elements 面板使用 `:hover` 强制状态，观察：

- 最上层命中元素是不是按钮或其合法 trigger wrapper；
- 透明分组标题是否出现在按钮之前；
- 标题的实际 `getBoundingClientRect()` 是否与按钮重叠；
- `pointer-events`、定位、transform、z-index 和负 margin 的来源。

2. 做一次仅用于诊断的 DevTools 修改：

- 临时给可疑标题设 `pointer-events: none`；或
- 临时取消其负 margin/定位规则。

如果无需改 Tooltip，真实鼠标 hover 立即恢复，这就是能区分原因的强证据。不要把临时修改直接当最终修复。

3. 若按钮确实是命中目标，继续沿链路检查：

```text
真实命中
→ pointerover/mouseenter 到达 trigger
→ Tooltip open 状态变化
→ 浮层 DOM 挂载
→ 浮层可见且未被裁剪/压在下层
```

分别用真实鼠标移动、事件监听断点和 DOM 检查确认停在哪一步。重点核对 Tooltip 与 Dropdown 是否都要求唯一子元素、是否 clone trigger、是否合并 handler，以及 ref 最终是否指向同一个真实按钮。

## 最小修复决策

| 证据 | 最小修复 |
|---|---|
| 标题或其容器覆盖按钮，禁用其命中后问题消失 | 修复分组标题的布局所有权：折叠态移除造成覆盖的尺寸/负 margin。若标题在折叠态纯装饰且确实无需选择或交互，可对该状态使用 `pointer-events: none`。 |
| 覆盖来自本应参与交互的元素 | 不使用 `pointer-events: none`；调整间距、尺寸或定位，使命中区域不重叠。不要只用更高 `z-index` 掩盖错误几何关系。 |
| 按钮能被命中，但事件在 Tooltip/Dropdown 组合处丢失 | 保持现有库，先按该版本公开 API 改成单一、明确的 trigger 元素，并正确合并 handler/ref。 |
| Tooltip 已打开并挂载，但不可见 | 修复 portal、overflow、stacking context 或定位边界；这不是 hover 监听问题。 |
| 在相同 DOM、CSS 和 trigger 配置下，仅旧 Tooltip 失败，而候选替代实现稳定通过 | 才考虑替换 Tooltip；同时核对键盘、焦点、延迟、portal、受控状态和 Dropdown 组合兼容性。 |

换言之，替换 Tooltip 的门槛应是一次受控 A/B 已经把布局覆盖和本地组合差异排除，而不是“换了以后症状消失”。否则容易把覆盖问题暂时藏住，并引入新的焦点和浮层行为差异。

## 验收方法

现有 `dispatchEvent` 测试可以保留为处理器级测试，但不能作为该缺陷的回归证明。新增或改造一条真实浏览器测试，渲染实际侧栏组合并通过鼠标坐标移动：

- 侧栏处于折叠状态，并包含真实的透明标题、负 margin、Tooltip 和 Dropdown。
- 将鼠标从外部移动到最后一个按钮的中心以及靠近覆盖边界的位置。
- 断言 `elementFromPoint` 命中按钮或其约定 trigger。
- 等待产品规定的 hover 延迟后，断言 Tooltip 以可访问名称/角色出现。
- 移出后断言 Tooltip 按预期关闭。
- 点击同一按钮，断言 Dropdown 正常打开，证明修复没有牺牲另一项交互。
- 用键盘 Tab 到按钮，检查焦点可见；按 Enter/Space 打开 Dropdown，Escape 后焦点回到 trigger。
- 至少复查折叠态、展开态和会触发该布局的窄视口；若支持多浏览器，覆盖实际受影响浏览器及一个基准浏览器。

最终通过标准不是“测试绿了”，而是：真实指针在最后一个按钮的可见点击区域能够命中它，Tooltip 与 Dropdown 都工作，且透明标题不再截获本不属于它的指针输入。