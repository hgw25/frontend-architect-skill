结论：目前不应替换底层 Tooltip。现有证据更支持“折叠态最后一个按钮被本地布局元素覆盖，真实鼠标命中失败”，但尚未达到确认根因的程度。

仓库当前没有应用源码或测试文件，`HEAD` 也是空文件树，因此无法核对具体 CSS、DOM 组合或提交修复。以下是基于已给现象的决策方案，而非已经定位到某条样式。

## 证据判断

- 直接向按钮 `dispatchEvent` 通过，只证明事件已经到达按钮后，监听器和 Tooltip 状态逻辑可以工作。它绕过了浏览器真实的 hit testing，不能排除覆盖层、裁剪或 `pointer-events`。
- 同版本上游 demo 正常，降低了 Tooltip 版本本身存在普遍缺陷的可能性，但不能排除本地 Tooltip/Dropdown 组合方式不符合组件契约。
- 只有“折叠侧栏最后一个按钮”失败，具有明显的位置相关性，比通用 Tooltip 缺陷更像边界布局或覆盖问题。
- 本地特有的透明分组标题和负 margin 是目前最有区分力的差异。若“透明”由 `opacity: 0`、透明颜色等实现，该元素仍可能参与命中；负 margin 又可能把它的盒子移到最后一个按钮上方。
- Tooltip 与 Dropdown 的 trigger 组合仍是第二顺位假设：两者可能竞争唯一子节点、`ref`、事件合并或 wrapper，但目前没有证据证明应该替换 Tooltip。

## 下一步调查顺序

恢复可运行环境后，先在失败页面上做以下检查：

1. 在按钮中心点执行 `document.elementsFromPoint(x, y)`，同时检查按钮和透明标题的 `getBoundingClientRect()`。
   - 若最上层元素不是按钮或其合法 trigger，覆盖假设成立。
   - 同时记录 `pointer-events`、`position`、`z-index`、transform 和祖先的 `overflow`。

2. 在 DevTools 中分别临时关闭：
   - 透明标题相关规则；
   - 负 margin；
   - 可疑元素的 pointer 命中。
   
   每次只改一个变量。某项关闭后真实 hover 恢复，才能把根因归到该规则。

3. 用真实鼠标和键盘区分故障层：
   - 鼠标失败、Tab 聚焦后 Tooltip/Dropdown 正常：强指向 hit testing/覆盖。
   - 按钮确实收到 `pointerenter`，但 Tooltip 不显示：再查 Tooltip/Dropdown trigger 组合。
   - Tooltip 已进入打开状态但不可见：查 portal、裁剪和层叠上下文，而不是事件。
   - 将相同组合临时移到侧栏中部；若正常，进一步确认是末尾几何关系而非组件组合。

4. 最后才对照上游 demo：
   - trigger 嵌套顺序；
   - 是否要求单一子元素或 `asChild`；
   - `ref` 与事件是否正确合并；
   - portal 容器、CSS 导入及受控状态是否不同。

## 最小修复决策

| 调查结果 | 最小修复 |
| --- | --- |
| 透明标题或邻接元素覆盖按钮 | 修正标题/列表所属布局，消除意外重叠；若标题明确永远不交互且没有交互子节点，可对它设置 `pointer-events: none` |
| 负 margin 造成点击区域交叠 | 调整 spacing、容器高度或布局结构，避免用额外 `z-index` 掩盖错误几何 |
| 按钮收到真实 pointer 事件，但 Tooltip 与 Dropdown 组合丢失 handler/ref | 按当前组件库支持的组合 API 调整 trigger 顺序或事件/ref 合并，保留现有库 |
| Tooltip 状态已打开但浮层不可见 | 修复 portal 容器、`overflow` 或层叠上下文 |
| 去掉全部本地布局差异后仍能最小复现，且官方支持的相同组合也失败；候选 Tooltip 在相同用例下正常 | 才考虑替换 Tooltip，并先确认键盘、焦点、延迟、portal 和 Dropdown 共存契约 |

不建议仅给按钮增加高 `z-index` 作为默认修复：它可能恢复 hover，却留下错误的可点击区域和新的层叠问题。

## 验收方法

新增浏览器级回归检查，必须使用真实命中路径，例如 Playwright 的 `locator.hover()` 或真实指针移动，不能再次直接 `dispatchEvent`。

验收条件：

- 在带透明分组标题、负 margin 和折叠侧栏的原始失败布局中，最后一个按钮能够被真实指针命中。
- hover 后 Tooltip 可见；点击后 Dropdown 正常打开。
- 回归测试在修复前能够复现失败、修复后通过。
- 相邻按钮、展开态侧栏和分组标题布局没有退化。
- Tab 可以到达按钮，焦点样式可见；Enter/Space 能打开菜单，Escape 关闭并恢复焦点。
- Tooltip 不遮挡或抢占 Dropdown 的点击区域。
- 至少在项目主支持浏览器及代表性窄高度视口下验证；若修复涉及层叠或 portal，再补第二个支持浏览器。

原来的组件测试可以保留，用于证明事件逻辑；但它不能作为此次“真实 hover 可用”的验收证据。