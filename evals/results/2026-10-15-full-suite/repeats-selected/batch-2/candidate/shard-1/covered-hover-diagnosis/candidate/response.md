结论：目前没有证据支持替换底层 Tooltip。证据更偏向本地布局导致的指针命中问题，尤其是“透明分组标题 + negative margin”；透明元素仍会参与 hit testing，偏移后的盒子可能覆盖最后一个按钮。

### 证据判断

- 组件测试直接对按钮 `dispatchEvent` 通过，只能证明：事件到达按钮后，相关处理逻辑能够工作。
- 它绕过了浏览器真实的坐标命中、层叠、覆盖、裁剪和 `pointer-events`，因此不能反驳“按钮被别的元素盖住”。
- 同版本上游 demo 正常，降低了 Tooltip 本身存在普遍缺陷的可能性。
- 只有“最后一个按钮”失效，又存在透明标题和 negative margin，首先应调查局部几何覆盖。
- Tooltip 与 Dropdown 的 trigger/ref/handler 组合仍是次级候选，但应先用命中结果区分，不应凭组件组合复杂就换库。

### 下一步调查顺序

1. 在故障现场，把鼠标置于按钮中心及四角，执行：

   ```js
   document.elementsFromPoint($0.getBoundingClientRect().x + $0.offsetWidth / 2,
                              $0.getBoundingClientRect().y + $0.offsetHeight / 2)
   ```

   更稳妥的是先保存按钮节点和 `getBoundingClientRect()`，再对中心及边缘采样。记录最上层元素；同时在 DevTools 中高亮透明分组标题的实际盒子。

2. 临时逐项禁用，仅作为诊断实验：

   - 分组标题的 negative margin；
   - 标题的定位、尺寸或伪元素；
   - 标题上的 `pointer-events`；
   - 相关容器的 `overflow`、`transform` 和层叠样式。

   某一项禁用后真实 hover 恢复，才把它视为因果证据。

3. 如果 `elementFromPoint` 确实返回按钮，再比较：

   - 正常按钮和最后一个按钮的 DOM 包装层；
   - Tooltip/Dropdown 的嵌套顺序；
   - trigger 是否要求单一子节点或 `asChild`；
   - `ref`、`onPointerEnter`、`onMouseEnter`、`onFocus` 是否被后一个组件覆盖；
   - collapsed 状态是否条件渲染了不同结构。

4. 只有在移除所有本地布局和样式影响后，仍能用最小复现证明同版本 Tooltip 接收真实 pointer 命中却不显示，才调查库缺陷、升级或替换。

### 最小修复的决策条件

- 若透明标题是命中顶层：修正标题自身的布局边界，优先移除或收窄造成覆盖的 negative margin。只有标题及其子树确认完全非交互、非语义入口时，才可局部使用 `pointer-events: none`。不要用提高按钮 `z-index` 掩盖错误布局。
- 若是 Tooltip/Dropdown 组合丢失 ref 或事件：按当前组件库的官方组合方式，让同一个语义按钮成为触发器并正确合并 ref/handlers。范围应限于该组合或项目已有 wrapper。
- 若最小隔离复现确认库缺陷：优先采用包含修复的兼容升级；只有升级不可行、缺陷可稳定复现且替代品能保持菜单、焦点和无障碍契约时，才替换 Tooltip。

现实的后续变化检查也支持这个边界：未来增加另一个侧栏分组时，正确的布局修复会自然适用；针对“最后一个按钮”的 `z-index` 或特例选择器则会再次失效。

### 验收方法

新增真实浏览器回归测试，不能再直接 `dispatchEvent`：

- 在折叠侧栏、实际 viewport 和真实样式下，通过可访问名称定位最后一个按钮。
- 使用 Playwright 一类工具的 `locator.hover()` 或真实鼠标坐标移动，断言 Tooltip 可见。
- 真实点击同一按钮，断言 Dropdown 打开且菜单项可操作。
- 鼠标从不同方向进入目标，至少覆盖中心和靠近分组标题的边缘。
- 键盘 Tab 到按钮，验证焦点可见；按 Enter/Space 打开菜单，Escape 关闭并恢复焦点。
- 保留一个相邻正常按钮作为对照，并确认回归测试在修复前失败、修复后通过。
- 手工在项目支持的代表性浏览器中复验折叠/展开状态，以及会改变几何关系的窄视口或缩放场景。

当前工作区没有应用源码或测试文件，我也不能运行应用，因此没有修改文件，以上结论是有明确验证门槛的诊断与修复决策，而不是已确认的根因。