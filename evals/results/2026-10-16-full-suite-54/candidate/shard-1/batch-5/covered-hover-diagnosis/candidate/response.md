结论：目前不应替换底层 Tooltip。现有证据更支持“最后一个按钮被本地布局层遮挡，真实指针没有命中按钮”，而不是 Tooltip 本身失效。替换 Tooltip 可能暂时改变 DOM 结构、掩盖问题，但不能证明或消除根因。

## 证据判断

- `button.dispatchEvent(...)` 通过，只能说明事件被直接送到按钮后，监听器及后续状态逻辑能够工作。它绕过了浏览器真实的布局、层叠和 hit testing，不能证明鼠标能命中按钮。
- 只有折叠侧栏最后一个按钮失败，具有明显的位置相关性。通用 Tooltip 缺陷通常不会只影响最后一个实例。
- 透明元素仍可能接收指针事件。`opacity: 0`、透明背景都不会退出 hit testing；负 margin 又可能把分组标题的盒子移动到按钮上方。这是当前优先级最高的假设。
- 同版本上游 demo 正常，说明 Tooltip 的标准用法至少可工作；但不能排除本地 Tooltip/Dropdown 组合方式、包装组件或 CSS 覆盖有问题。
- Tooltip 与 Dropdown 共同包装同一触发器确实是第二假设：二者可能竞争 trigger ref、克隆子节点、覆盖事件处理器或产生额外 wrapper。但在证明按钮确实收到真实指针事件前，不应先追这个方向。

## 下一步调查顺序

1. 在故障状态下取得按钮中心点及四周若干点，检查：

   ```js
   const rect = button.getBoundingClientRect()
   document.elementsFromPoint(
     rect.left + rect.width / 2,
     rect.top + rect.height / 2
   )
   ```

   顶层元素必须是按钮或其可接受的后代。记录按钮、透明标题及相邻容器的边界矩形和计算样式，重点看 `pointer-events`、`position`、`z-index`、`opacity`、`visibility`、`overflow` 和负 margin。

2. 仅在 DevTools 中逐项关闭本地变量，每次只改一项：

   - 取消分组标题的负 margin；
   - 给纯装饰的透明标题临时加 `pointer-events: none`；
   - 隐藏标题；
   - 分别移除 Tooltip、Dropdown；
   - 将相同按钮临时移到非末尾位置，或给它后面增加一个按钮。

   若故障跟随“末尾位置”，优先判定为布局覆盖；若跟随该组件实例，才继续查组合逻辑。

3. 如果 `elementsFromPoint` 已正确命中按钮，用捕获阶段监听真实 `pointerover`、`mouseover`、`pointerenter`、`focusin`，检查事件路径。随后对比：

   - 按钮单独存在；
   - 仅 Tooltip；
   - 仅 Dropdown；
   - Tooltip 与 Dropdown 组合。

   同时检查两套 primitive 是否都要求唯一触发元素、转发 ref、合并事件处理器，以及当前嵌套是否生成了按钮套按钮等非法结构。

## 最小修复决策

| 已证明的条件 | 应采用的最小修复 |
|---|---|
| 透明标题位于 `elementsFromPoint` 顶层，取消负 margin 后恢复 | 修正布局关系，优先用正常 `gap`/padding 留出空间，避免元素几何范围重叠 |
| 重叠是有意布局，标题确实纯装饰、没有交互子项 | 在标题的局部样式上使用 `pointer-events: none`；不要做全局选择器补丁 |
| 指针正确命中按钮，但 Tooltip/Dropdown 组合才失败 | 按当前组件库支持的 trigger composition 重组为一个真实触发元素，并正确转发 ref、合并 handlers；避免自行模拟事件 |
| 正确 hit testing、正确官方组合方式下，Tooltip 单独仍能稳定复现；替代实现消除问题 | 此时才替换 Tooltip，并把键盘、焦点、ARIA、portal、碰撞定位和 Dropdown 共存行为纳入迁移范围 |

不要以“替换后看起来好了”作为根因证据；若替换改变了 wrapper 尺寸或层叠关系，它仍可能只是绕开覆盖区域。

## 验收方法

必须增加真实浏览器测试，而不是继续对元素直接 `dispatchEvent`：

- 使用 Playwright/Cypress 的真实鼠标移动，从按钮外移动到折叠侧栏最后一个按钮中心，不使用 `force`。
- 验证 Tooltip 可见，再真实点击同一触发器并验证 Dropdown 打开、菜单项可操作。
- 保留生产中的折叠布局、相邻分组和相关 CSS，覆盖最初失败的视口；再检查相邻尺寸和展开侧栏。
- 用键盘聚焦触发器，验证 Tooltip/Dropdown 的焦点、Enter/Space、Escape 和焦点恢复行为。
- 确认透明标题不再截获指针，且标题区域本身没有失去原本需要的交互。
- 修复前同一浏览器用例应失败，修复后通过。原有直接派发事件的组件测试可以保留，但只能作为事件处理逻辑的单元证据。

当前工作区没有应用源码或测试，只有本地 Skill，因此没有可安全实施的代码修改，也没有运行时验证结果；以上决策仍需由真实应用中的 hit-testing 证据落锤。