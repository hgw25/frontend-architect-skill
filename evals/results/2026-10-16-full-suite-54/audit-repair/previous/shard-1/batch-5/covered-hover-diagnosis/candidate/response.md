结论：暂不替换底层 Tooltip。当前证据更优先指向本地布局造成的命中区遮挡；Tooltip 与 Dropdown 的组合问题排第二，组件库自身缺陷排第三。先做真实浏览器命中测试，再决定修复层。

工作区除 `.frontend-architect` 与 Git 元数据外没有应用源码、样式或测试，Git `HEAD` 也是空树，因此无法给出具体文件、选择器或已确认根因；本次未修改任何文件。

## 证据判断

| 证据 | 能说明什么 | 不能说明什么 |
|---|---|---|
| 实际应用中最后一个按钮 hover 无反应 | 用户路径确实失败 | 尚不能区分事件没命中、Tooltip 未创建、浮层被遮挡 |
| 直接对按钮 `dispatchEvent` 会通过 | 事件到达指定节点后，至少测试路径能响应 | 绕过了浏览器 hit testing，不能证明鼠标能实际命中按钮 |
| 同版本上游 demo 正常 | 降低“该版本 Tooltip 普遍损坏”的概率 | 没覆盖本地 CSS、组合顺序、Portal 容器和触发器写法 |
| 本地存在透明分组标题与负 margin | 构成直接、可验证的遮挡假设 | 未经 `elementsFromPoint` 和 CSS 开关实验，仍不是已确认根因 |
| Tooltip 与 Dropdown 组合 | 可能存在 ref、事件处理器或触发节点组合冲突 | 目前没有证据支持直接替换依赖 |
| 团队建议更换 Tooltip | 可作为对照实验 | 不是根因证据，也不是当前最小修复 |

透明元素仍可能参与 pointer hit testing；负 margin 又可能把它的盒子移到最后一个按钮之上。这也解释了为什么只有实际鼠标失败，而直接向按钮派发事件成功。

## 下一步调查顺序

在故障状态下选择最后一个按钮，以 `$0` 表示它，在浏览器 DevTools 执行：

```js
const r = $0.getBoundingClientRect();

[
  [0.5, 0.2],
  [0.5, 0.5],
  [0.5, 0.8],
].map(([x, y]) =>
  document.elementsFromPoint(
    r.left + r.width * x,
    r.top + r.height * y,
  )
);
```

按以下顺序判断：

1. 检查按钮可见区域上、中、下三个点最上层元素是谁。
2. 对比按钮、透明标题及父容器的 `getBoundingClientRect()`。
3. 检查标题的 `pointer-events`、`position`、`z-index`、`transform`、`opacity` 和负 margin。
4. 在 DevTools 中一次只改变一个条件：
   - 临时关闭负 margin；
   - 临时隐藏标题；
   - 临时给纯展示标题设置 `pointer-events: none`。
5. 每次都通过真实鼠标重新 hover；随后恢复声明，确认故障再次出现。
6. 如果按钮确实是最上层命中对象，监听捕获阶段的 `pointerover`，再检查 Tooltip Portal 中是否已经生成 `[role="tooltip"]`：
   - 没生成：调查触发器组合、事件和 ref；
   - 已生成但不可见：调查裁剪、层叠上下文、位置和 Portal 容器；
   - Tooltip 正常但 Dropdown 异常：单独检查 Dropdown 的触发契约。

接着做两个最小隔离对照：在相同侧栏布局中分别保留 Tooltip-only、Dropdown-only，再恢复两者组合。必须保留同一个真实按钮、同一份本地 CSS，避免把布局差异误判为组件差异。

## 最小修复的决策条件

- 如果透明标题位于 `elementsFromPoint()` 顶层，并且关闭其重叠后 hover 恢复：修复本地布局，不更换 Tooltip。优先消除错误重叠，例如折叠时不渲染/不占用该标题盒子，或用正常的 `gap`、padding 代替负 margin。只有标题完全是展示性内容且没有交互后代时，才适合用 `pointer-events: none`。不建议先用更大的 `z-index` 掩盖几何问题。

- 如果鼠标事件到达预期按钮，但只有 Tooltip + Dropdown 组合时失败：按组件库文档修正组合契约，确保只有一个语义按钮、正确转发 ref，并且两个触发器不会覆盖彼此的事件处理器。优先调整组合顺序或项目已有的 `asChild`/trigger API，而不是替换整个 Tooltip。

- 如果 Tooltip DOM 已创建但不可见：最小修复应落在 Portal、overflow/clipping 或层叠上下文处。更换事件组件不会修复这个问题。

- 只有同时满足以下条件才考虑替换 Tooltip：
  1. 使用文档支持的最小写法；
  2. 移除本地重叠 CSS 后仍能在真实浏览器复现；
  3. 事件确实到达触发节点；
  4. 同版本的隔离复现仍失败；
  5. 候选替代实现能在相同 DOM 和 CSS 下消除故障；
  6. 已验证键盘触发、焦点、可访问描述、Portal、延迟及 Dropdown 组合行为。

## 验收方法

新增真实浏览器测试，不能再用 `dispatchEvent` 作为本缺陷的回归证明。Playwright/Cypress 测试应：

- 展开应用并切换到折叠侧栏；
- 定位最后一个按钮；
- 使用非强制的真实 hover，例如 `locator.hover()`，不要设置 `force: true`；
- 断言对应 `role="tooltip"` 可见；
- 从按钮移开后，按产品契约验证 Tooltip 消失；
- 点击同一按钮并验证 Dropdown 可见、菜单项可操作；
- 验证键盘能聚焦按钮，Enter/Space/Escape 与焦点恢复符合现有契约；
- 将倒数第二个按钮作为正常对照；
- 覆盖实际支持的窄视口、常用桌面视口和至少一个放大场景；
- 对按钮可见区域的多个点做 hit-test，确保不是只有中心点碰巧可用。

现有直接 `dispatchEvent` 的组件测试可以保留，定位为“事件到达触发器后的接线测试”；真实浏览器 hover 测试才是这次故障的决定性回归保障。