# Headless Dialog primitive

一个无产品文案、无内置视觉样式的 React modal Dialog。它把三个产品需要一致遵守的状态、ARIA、键盘和焦点策略收口在 primitive 内；产品继续拥有内容、按钮文案、布局、动效和 className。

## 公共 API

```tsx
import { Dialog } from '@fixture/headless-dialog'

<Dialog.Root defaultOpen={false} onOpenChange={(open) => {}}>
  <Dialog.Trigger className="button">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="dialog">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* product fields and actions */}
        <Dialog.Close className="button">Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

- `Root`: `open` + `onOpenChange` 为受控模式，`defaultOpen` 为非受控初值。状态只在这里拥有。
- `Trigger` / `Close`: 原生 `button` props 与 ref 可用；消费者事件先运行，调用 `preventDefault()` 可取消 primitive 的状态变化。
- `Portal`: 默认挂到 `document.body`，也可传 `container`。服务端不访问浏览器全局，portal 在水合后的 effect 中挂载。
- `Overlay`: 原生 `div` props 与 ref 可用；点击 overlay 自身关闭，点击内容不关闭。
- `Content`: 建立 `role="dialog"`、`aria-modal`、稳定的标题/描述关联，负责顶层 Dialog 的初始聚焦、Tab 环绕、Escape 和关闭后焦点恢复。`initialFocusRef` 可覆盖默认的首个可聚焦元素；`onEscapeKeyDown` 可用 `preventDefault()` 取消关闭。
- `Title` / `Description`: 提供稳定 ID 并自动与 `Content` 关联。若视觉设计不展示标题，仍应渲染一个由产品样式隐藏的 `Title`；也可直接给 `Content` 提供 `aria-label`。

以上 parts 和对应 props 类型也提供独立 named exports。包只发布 ESM 与 TypeScript declarations，React/ReactDOM 是 peer dependencies；内部焦点栈不在 `exports` 中。

## 实现边界与不变量

- 每个 Root 只有一个打开状态来源；受控模式只发出变更意图，不复制消费者状态。
- 每个 document 有一个私有 modal 栈；只有栈顶响应 Escape、限制焦点和执行 Tab 环绕，因此嵌套关闭不会误关父层。
- Content 挂载时记录返回点，关闭或卸载时优先恢复 Trigger。portal 生命周期和 DOM 事件监听都由 Content 清理。
- primitive 不拥有产品文案、业务操作、视觉 token、z-index 体系或动画；这些均通过 children、原生 DOM props、ref 和 className 组合。
- SSR 输出稳定的 closed shell。即使 `defaultOpen` 为 true，portal 内容也等客户端挂载后出现，从而不在服务端读取 `document`，也不制造 hydration mismatch。

## 测试矩阵

| 风险 | 自动化边界 | 当前覆盖 |
| --- | --- | --- |
| ARIA name/description/modal state | Chromium accessibility tree | Playwright |
| 初始焦点、正反向 Tab 环绕、程序化焦点逃逸 | 真实 Chromium | Playwright |
| Escape 与焦点恢复 | 真实 Chromium | Playwright |
| 嵌套层只关闭栈顶并恢复局部触发点 | 真实 Chromium | Playwright |
| overlay 与组合式 Close | 真实 Chromium | Playwright |
| 受控与非受控状态 | 真实 Chromium 示例 | Playwright |
| Node SSR 不访问 DOM | `react-dom/server` | Vitest node environment |
| 真实 hydration 后 portal 可用且无 mismatch | 预渲染 HTML + `hydrateRoot` | Playwright |
| public exports、declarations、peer externalization | 构建产物和 pack 清单 | Vite + TypeScript + `npm pack --dry-run` |

发布支持矩阵当前只声明 React 19.1 和 ESM 消费者，浏览器行为基线为项目 CI 中的 Desktop Chromium。扩展 React 范围、CJS 或 Firefox/WebKit 前，应先把对应消费者/浏览器加入矩阵，而不是只放宽字段。

## 三个产品的迁移

1. 先发布 `0.x` prerelease，让三个产品仅替换一个低风险 Dialog：旧组件暂时保留，primitive 和产品 wrapper 可并存，回滚只需恢复 import。
2. 每个产品建立薄 wrapper，保留原组件的业务 props 和样式，在内部映射到 `Root/Trigger/Portal/Overlay/Content/Title/Description/Close`。先逐一核对标题、描述、初始焦点、Escape、overlay close 和关闭后返回点。
3. 对原受控组件映射 `open/onOpenChange`；原内部状态组件映射 `defaultOpen`。嵌套场景必须整组迁移，避免新旧两套全局 Escape/focus trap 同时运行。
4. 在各产品的真实主题、长文案和层级系统中跑键盘路径与视觉回归；若产品不允许点击遮罩关闭，在 wrapper 的 `Overlay.onClick` 中 `preventDefault()`，不要分叉 primitive。
5. 三个产品均稳定后移除旧实现和重复的 document listeners，再发布稳定版。焦点或 Escape 语义变化按 breaking change 沟通；不要只按 TypeScript 签名判断 SemVer。

本地完整验证命令为 `npm run check`。
