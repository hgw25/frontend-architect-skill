结论：现有证据不支持替换底层 Tooltip。当前最高概率是本地布局造成命中区域被透明元素覆盖；直接 `dispatchEvent` 的组件测试绕过了浏览器 hit testing，只证明“事件到达按钮后逻辑可工作”。

当前仓库的 Git 树没有应用源码或测试文件，只有 `.frontend-architect` 指导文件，因此无法核对具体 DOM/CSS，也没有修改代码。以下结论需在真实应用中验证后才能定为根因。

## 证据判断

| 证据 | 能说明什么 | 不能说明什么 |
| --- | --- | --- |
| 实际应用最后一个按钮 hover 无反应 | 真实用户路径存在问题 | 不能直接归因于 Tooltip |
| 对按钮 `dispatchEvent` 的测试通过 | 按钮收到合成事件后，相关处理链可能正常 | 不验证鼠标命中、遮挡、真实事件顺序及 `isTrusted` 差异 |
| 同版本上游 demo 正常 | 依赖版本不存在普遍失效 | 不排除本地组合方式、CSS、主题配置差异 |
| 仅最后一个按钮失败 | 问题与位置或相邻元素高度相关 | 不像 Tooltip 全局实现普遍失效 |
| 附近有透明标题和负 margin | 存在可信的覆盖路径：`opacity: 0` 元素仍参与命中，负 margin 可能让其盒子进入按钮区域 | 未检查实际边界前仍只是高优先级假设 |
| Tooltip 与 Dropdown 组合 | 可能存在 ref、事件或 trigger 组合问题 | 只有确认事件已命中按钮后，才应优先追查这一层 |

## 下一步调查顺序

1. 在真实页面进入折叠状态，用 DevTools 检查最后一个按钮中心点和四角：

   ```js
   const rect = button.getBoundingClientRect();
   document.elementsFromPoint(
     rect.left + rect.width / 2,
     rect.top + rect.height / 2
   );
   ```

   返回链中允许出现按钮的子元素，但必须最终属于该按钮。若最上层是透明分组标题或其容器，遮挡假设成立。

2. 同时比较按钮与标题的 `getBoundingClientRect()`，检查标题及祖先的：

   - `opacity`
   - `visibility`
   - `pointer-events`
   - `position`
   - `z-index`
   - `transform`
   - margin 和实际盒模型范围

3. 在 DevTools 中逐项临时禁用，而不是一次改多项：

   - 隐藏分组标题；
   - 移除负 margin；
   - 对确定为非交互的标题临时设置 `pointer-events: none`。

   任何单项能稳定恢复 hover，才构成因果证据。

4. 若命中目标确实属于按钮，继续区分：

   - `button.matches(':hover')` 为 `false`：检查按钮自身/祖先的 `pointer-events`、disabled 状态及覆盖层。
   - `:hover` 为 `true`，Dropdown 点击正常，但 Tooltip 不出现：检查 Tooltip trigger 的事件合并、ref 转发及受控状态。
   - Tooltip 内容已挂载但不可见：检查 portal、裁剪、层叠上下文和 `z-index`。
   - Tooltip 和 Dropdown 都失效：优先检查组合后的唯一实际 trigger、DOM 嵌套和事件传播。

5. 将本地组合缩减成与上游 demo 相同的最小例子，再逐个加回 Dropdown、折叠样式、标题和负 margin。第一个使问题复现的差异就是修复边界。

## 最小修复决策

- 如果透明标题覆盖按钮：

  - 折叠时标题本就不应存在：优先不渲染或 `display: none`。
  - 必须保留布局空间但不应交互：考虑 `visibility: hidden`。
  - 必须视觉透明且仅作装饰：可使用 `pointer-events: none`，但前提是它及其子元素没有任何交互职责。
  - 若负 margin 只是为了挤间距：改为容器 `gap`、padding 或明确的折叠布局规则。

  不建议仅给按钮增加更高 `z-index`；这会掩盖错误盒模型，并可能制造新的菜单层叠问题。

- 如果按钮已正确命中，但 Tooltip/Dropdown 组合失败：

  先按当前组件库支持的组合契约修正单一 trigger、事件合并和 ref 转发。避免两个 wrapper 分别复制或替换同一个子元素。此时仍优先修本地集成，不替换整个 Tooltip。

- 只有同时满足以下条件，才进入 Tooltip 替换评估：

  1. 已排除覆盖、裁剪和本地 CSS；
  2. 在真实浏览器的最小复现中，当前 Tooltip 与 Dropdown 的受支持组合仍失败；
  3. 失败可定位为当前 Tooltip 的实现或已知兼容性限制；
  4. 替代方案已验证 hover、focus、键盘、ARIA、延迟、portal 和关闭/焦点恢复行为；
  5. 替换成本小于局部适配，并有浏览器回归测试保护。

## 验收方法

决定性测试必须使用真实浏览器的鼠标移动，例如 Playwright 的 `locator.hover()`；不能再以直接 `dispatchEvent` 作为本问题的回归证明。

验收至少覆盖：

- 折叠侧栏的真实页面结构、样式和数据下，最后一个按钮可被实际鼠标命中；
- hover 后按钮进入 `:hover`，预期 Tooltip 可见；
- 点击同一按钮可打开 Dropdown；
- 键盘 Tab 能聚焦，Tooltip 的 focus 行为及 Dropdown 的键盘打开/关闭正常；
- 相邻按钮、展开状态及折叠往返后仍正常；
- 至少检查一个窄视口和项目常用视口；
- 修复前该浏览器用例能够失败，修复后通过；
- 若修改了隐藏标题方式，确认按钮 accessible name 和侧栏阅读顺序没有退化。

原有组件测试可以保留，用来保护“事件到达 trigger 后”的逻辑；但必须补充包含真实侧栏布局的浏览器组件测试或端到端测试，才能覆盖这次故障。