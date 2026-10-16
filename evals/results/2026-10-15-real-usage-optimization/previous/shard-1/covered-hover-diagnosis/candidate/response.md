结论：现在不应替换底层 Tooltip。现有证据更支持“折叠侧栏中的实际指针命中被本地布局遮挡”，但尚未确认。应先做一次浏览器命中测试；只有排除遮挡和组合方式后，才能把责任归到 Tooltip。

### 证据判断

| 证据 | 能证明什么 | 不能证明什么 |
| --- | --- | --- |
| 实际应用 hover 无反应 | 用户路径确实失败 | 不能定位是 Tooltip、Dropdown 还是 CSS |
| 对按钮直接 `dispatchEvent` 通过 | 事件到达按钮后，现有处理链可能工作 | 完全绕过浏览器坐标命中，不能证明按钮可被真实鼠标命中 |
| 同版本上游 demo 正常 | 通用版本缺陷概率下降 | 上游没有本地侧栏布局、样式覆盖和包装顺序 |
| 本地有透明分组标题、负 margin | 提供了高相关的遮挡候选 | 仍需 `elementsFromPoint` 或样式切换确认 |

透明不等于不可交互。仅使用 `opacity: 0` 的元素仍可参与 pointer hit testing；负 margin 又可能使它的盒模型覆盖最后一个按钮。两者组合与“只有最后一个按钮失败”高度吻合。

### 下一步调查顺序

1. **确认真实命中对象**

   在浏览器 DevTools 中选中最后一个按钮，检查按钮中心及四角：

   ```js
   const rect = $0.getBoundingClientRect()
   document.elementsFromPoint(
     rect.left + rect.width / 2,
     rect.top + rect.height / 2
   )
   ```

   同时对正常按钮执行一次作为对照。记录：

   - 列表首项是否真的是按钮或其预期子元素；
   - 透明标题、标题容器或其他侧栏层是否位于按钮之前；
   - 两者的 `getBoundingClientRect()` 是否重叠；
   - `pointer-events`、`opacity`、`visibility`、`position`、`z-index`、`transform` 和 `overflow`。

2. **用 DevTools 做可撤销的区分实验**

   依次单独切换，不要同时改多个变量：

   - 给透明标题临时加 `pointer-events: none`；
   - 临时隐藏标题；
   - 临时取消负 margin；
   - 临时移除 Tooltip，但保留 Dropdown；
   - 临时移除 Dropdown，但保留 Tooltip。

   哪一个单变量变化恢复真实 hover，哪一个才是修复入口。不要把临时 `z-index` 调整直接当成修复。

3. **若命中正确，再查 Tooltip/Dropdown 组合**

   核对：

   - 两层组件是否都要求唯一 DOM trigger；
   - `ref` 最终是否指向真实按钮；
   - 两层是否合并而非覆盖 `onPointerEnter`、`onMouseEnter`、`onFocus` 等处理器；
   - 包装顺序、trigger 配置和受控 `open` 状态是否与正常按钮一致；
   - 关闭状态的浮层是否意外残留并截获事件。

4. **最后才做最小复现**

   将相同 Tooltip、Dropdown 和按钮放到侧栏布局之外，再逐项加回折叠容器、分组标题和负 margin。若脱离本地布局仍失败，再与同版本上游 demo 对齐 props、包装顺序和样式入口。

### 最小修复的决策条件

- **若顶层命中对象是透明标题或其容器，且禁用其命中后恢复：**  
  修复侧栏布局，不换 Tooltip。

  - 标题在折叠态完全无意义：条件渲染或 `display: none`。
  - 需要保留布局占位但不应交互：`visibility: hidden`，必要时明确 `pointer-events: none`。
  - 标题仍需显示：消除重叠的负 margin 或修正布局约束。
  - 不优先使用任意增大的 `z-index`，因为它只改变谁覆盖谁，容易制造新的重叠问题。

- **若按钮确为顶层命中对象，但 Tooltip/Dropdown 组合丢失事件或 ref：**  
  按当前组件库支持的组合方式修正包装顺序、事件合并或 ref 转发。不要盲目增加额外 `<span>`；它可能改变焦点、键盘行为和布局。

- **只有满足以下全部条件，才建议替换 Tooltip：**

  1. 实际 hit testing 已确认没有遮挡；
  2. 支持的组合方式、ref 和事件合并均正确；
  3. 脱离侧栏自定义 CSS 的最小复现仍失败；
  4. 仅替换 Tooltip、保持其他条件不变即可稳定恢复；
  5. 新实现的 hover、focus、键盘、portal 和清理行为已验证。

当前证据没有达到这个门槛。直接替换很可能只是通过不同 DOM 或 stacking 行为掩盖布局缺陷。

### 验收方法

保留现有 `dispatchEvent` 测试可以覆盖“事件已经送达后的组件逻辑”，但它不能作为这个缺陷的回归测试。应新增真实浏览器测试，例如 Playwright：

```ts
await lastButton.hover()
await expect(page.getByRole('tooltip')).toBeVisible()
```

不要使用强制 hover，也不要直接派发事件，否则仍会绕过遮挡。验收至少包括：

- 折叠侧栏下，真实鼠标 hover 最后一个按钮能显示正确 Tooltip；
- 鼠标移出后 Tooltip 正常关闭；
- Dropdown 的打开、选择和关闭行为没有回归；
- 按钮可通过键盘聚焦，Tooltip/Dropdown 的既有键盘行为仍成立；
- 展开侧栏不受影响；
- 最后一个按钮在侧栏滚动、窄视口及项目支持的缩放条件下仍可命中；
- 修复前该浏览器用例能复现失败，修复后通过；
- 至少在项目主要支持浏览器中执行原始路径，其他浏览器按现有支持矩阵抽查。

工作区中除 `.frontend-architect` 外没有应用源码或测试文件，因此本次无法核对具体组件结构、样式选择器或执行测试；没有修改任何文件。