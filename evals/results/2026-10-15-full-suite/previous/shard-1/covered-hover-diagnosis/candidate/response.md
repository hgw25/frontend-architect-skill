结论：目前证据不支持替换底层 Tooltip。优先级最高的假设是本地布局产生了透明但仍参与命中测试的覆盖层；其次才是 Tooltip 与 Dropdown 的触发器事件/ref 组合问题。组件测试直接 `dispatchEvent` 会绕过浏览器命中测试，因此它通过并不能反驳实际故障。

仓库当前 `HEAD` 和工作区均没有应用源码，只有 `.frontend-architect`，且按要求未修改。因此以下是调查与决策方案，不能声称已定位具体选择器。

## 证据判断

| 现有证据 | 能说明什么 | 不能说明什么 |
|---|---|---|
| 实际应用 hover 无反应 | 用户路径确实失败 | 不足以判断事件没到达、状态没打开，还是浮层被遮挡 |
| 测试对按钮直接 `dispatchEvent` 通过 | 按钮收到合成事件后，部分逻辑能工作 | 不验证坐标命中、覆盖、`pointer-events`、真实事件顺序 |
| 同版本上游 demo 正常 | 降低 Tooltip 版本自身普遍缺陷的可能性 | 不排除本地组合方式、CSS、portal 容器或构建差异 |
| 本地有透明分组标题和负 margin | 存在覆盖最后一个按钮命中区域的可信机制 | 在检查实际边界框前仍只是候选原因 |
| Tooltip 与 Dropdown 组合 | 可能存在 child props、事件处理器或 ref 转发冲突 | 不能仅凭“组合复杂”认定组件库有问题 |

透明不等于不可命中：`opacity: 0`、透明背景或无文字的普通盒子仍可能拦截指针。负 margin 又可能把该盒子的实际区域推到最后一个按钮上方。

## 下一步调查顺序

1. **先定义“hover 没反应”的具体观察**

   分别确认按钮 hover 样式、Tooltip 出现、鼠标形态以及点击打开 Dropdown 哪一项失败。若点击也失败，更像命中被覆盖；若点击正常但 Tooltip 不出现，再查触发器组合或浮层呈现。

2. **在复现状态检查真实命中目标**

   在折叠侧栏中选中最后一个按钮，取中心点执行：

   ```js
   const rect = $0.getBoundingClientRect()
   document.elementsFromPoint(
     rect.left + rect.width / 2,
     rect.top + rect.height / 2
   )
   ```

   同时检查按钮、透明标题及其容器的：

   - `getBoundingClientRect()`
   - `pointer-events`
   - `position`、`z-index`
   - `overflow`
   - margin 和 transform
   - DevTools 的 `:hover` 状态

   如果列表顶部不是按钮或其预期子元素，覆盖假设即被确认。

3. **逐项关闭本地差异做区分实验**

   按顺序一次只改一项：

   - 隐藏或取消渲染透明分组标题；
   - 取消负 margin；
   - 保留 Dropdown、移除 Tooltip；
   - 保留 Tooltip、移除 Dropdown；
   - 恢复两者并交换为上游 demo 的确切嵌套方式。

   记录哪一个单独变化恢复真实鼠标 hover。不要同时改 CSS 和组件，否则无法确定责任边界。

4. **若按钮确实收到命中，再查组合契约**

   对照上游 demo 和当前版本文档，检查两个组件是否都要求：

   - 唯一且可接收事件的 DOM child；
   - child 正确转发 `ref`；
   - `onMouseEnter`、`onMouseLeave`、`onPointerEnter`、focus 和 click handler 被合并而非覆盖；
   - portal/popup container、受控 open 状态和 disabled 状态一致。

5. **若 open 状态发生但看不到 Tooltip**

   检查 popup 是否已插入 DOM，以及是否被局部 `overflow` 裁剪、错误 portal 容器、层叠上下文或 `z-index` 遮挡。这属于呈现失败，不是 hover 事件失败。

## 最小修复的决策条件

- **命中目标是透明标题或其容器：**在该布局所有者处修复，不换 Tooltip。

  首选折叠态不渲染该标题或使用 `display: none`，前提是它在折叠态没有必要的交互和可访问语义。如果标题只用于分组命名，应通过 `aria-labelledby` 或项目已有的 visually-hidden 模式保留语义，而不是留下覆盖按钮的大型透明盒子。只有确认标题及其后代永远不需要指针交互时，`pointer-events: none` 才是合适的局部修复。

- **取消负 margin 单独恢复行为：**改为正常布局间距或调整容器结构，使兄弟元素的命中区域不重叠。不要用更高 `z-index` 把按钮“顶回来”，那会保留错误几何关系。

- **命中正确，但 Tooltip/Dropdown 组合丢失事件或 ref：**采用该组件库文档支持的 trigger/as-child 组合，或增加一个明确合并事件并转发 ref 的本地触发器。修复范围应只覆盖这一组合边界。

- **事件和 open 状态正常，仅浮层不可见：**修复 portal、裁剪或层叠上下文。

- **只有满足以下全部条件才考虑替换 Tooltip：**

  1. 去掉本地覆盖与负 margin 后仍可复现；
  2. 真实指针已命中正确触发器；
  3. 当前组合符合文档，ref 与事件没有被覆盖；
  4. 最小浏览器复现能指向 Tooltip 内部缺陷；
  5. 替代组件能保持 hover、focus、Escape、`aria-describedby`、延迟和 portal 行为。

否则替换 Tooltip 会掩盖布局缺陷，并扩大回归范围。

## 验收方法

必须新增或修改一个真实浏览器测试，不能继续以直接 `dispatchEvent` 作为该缺陷的决定性证据。

在项目既有浏览器测试框架中覆盖：

- 使用复现时的侧栏折叠状态、数据和视口；
- 通过真实坐标移动鼠标，或使用带 actionability/命中检查的 `locator.hover()`；
- 断言 Tooltip 在规定延迟后可见，移出后消失；
- 点击按钮后 Dropdown 正常打开；
- 用 `Tab`/`Enter` 或项目契约规定的键盘方式访问按钮和菜单；
- 验证最后一个按钮、相邻按钮、展开态侧栏均未回归；
- 在能触发底部重叠的窗口高度以及项目支持的缩放条件下复测。

修复前，该浏览器测试应在原布局下失败；修复后应通过。`elementsFromPoint()` 很适合诊断，但不建议作为长期断言，因为它会把测试绑定到内部 DOM。最终验收应断言用户可观察结果：真实指针能够触发 Tooltip，并且 Dropdown 与键盘操作仍然有效。