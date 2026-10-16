# Headless Dialog primitive

这个包把三个产品重复实现的模态行为收敛为一个无样式 React primitive。它只拥有打开状态协调、portal、ARIA 关联、模态层栈、背景隔离和焦点生命周期；标题、说明、业务操作、文案、布局、颜色和动画均由消费者拥有。

## 公开 API

```tsx
import { Dialog } from 'frontend-architect-dialog-browser-eval'

<Dialog.Root defaultOpen={false} onOpenChange={setOpen}>
  <Dialog.Trigger className="trigger">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="panel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* product fields and actions */}
        <Dialog.Close>Cancel</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

- `Root`: `open` + `onOpenChange` 为受控模式，`defaultOpen` 为非受控模式；二者都使用同一行为路径。
- `Trigger` / `Close`: 原生 button props 与 ref；消费者事件先运行，`preventDefault()` 可取消默认状态变更。
- `Portal`: 默认挂到 `document.body`，`container` 可指定宿主。服务端及水合首帧不创建 portal，挂载后才显示默认打开的内容。
- `Overlay`: 原生 div props 与 ref；只在指针直接命中最上层遮罩时关闭。
- `Content`: 原生 div props 与 ref，固定提供 `role="dialog"`、`aria-modal="true"` 和焦点约束；`initialFocusRef` 可指定初始焦点，`onEscapeKeyDown` 可通过 `preventDefault()` 阻止 Escape 关闭。
- `Title` / `Description`: 生成稳定 ID 并自动关联到 `Content`。没有可见标题时，消费者必须给 `Content` 提供 `aria-label` 或 `aria-labelledby`。

每个部件也有对应 named export（如 `DialogRoot`、`DialogContent`）及 props 类型。包只发布 ESM 和声明文件；React 与 React DOM 是 peer dependencies。`data-state` 是状态样式钩子，`className`、`style` 和普通 DOM 属性由消费者自由提供。`data-dialog-portal` 仅是内部层边界，不应作为样式 API。

## 核心边界与不变量

- `DialogRoot` 是单个实例打开状态和稳定 ARIA ID 的唯一 owner，不读取浏览器全局。
- `DialogPortal` 是 SSR 与浏览器能力边界；服务端输出和水合首帧一致。
- `dialog-layer` 是所有实例共享的模态资源 owner。它只让栈顶响应 Escape/Tab，嵌套关闭后恢复到本层 trigger，最后一层关闭后恢复原有 `inert`、`aria-hidden` 和 body overflow。
- `Content` 注册和释放模态层；卸载、受控关闭和 React Strict Mode 重跑都走同一清理路径。
- primitive 不提供默认文案、业务按钮、视觉 CSS 或动画。产品可以改变 DOM 内容和样式，但不能绕过 `Content` 的 dialog role、焦点与模态语义。

## 验证矩阵

| 风险 | 场景 | 证据/发布门禁 |
| --- | --- | --- |
| 焦点 | 初始焦点、正反向 Tab 环绕、程序化背景聚焦、关闭恢复 | Playwright 真实 Chromium |
| 键盘/嵌套 | 只有栈顶处理 Escape；子层关闭回到子 trigger，父层继续可用 | Playwright 真实 Chromium |
| 语义 | accessible name/description、`aria-modal`、背景 `inert`/`aria-hidden` | Playwright accessibility locators + DOM assertions |
| 状态 | 非受控打开；受控 `open/onOpenChange` 打开和产品 Close | Playwright |
| 指针 | 直接点遮罩关闭；内容交互不误关；消费者可 prevent default | 合入前浏览器回归；新增策略时补用例 |
| SSR/水合 | closed 与 `defaultOpen` 服务端不访问 DOM，首帧结构稳定，挂载后建 portal | Vitest server render；框架接入时跑该产品的 hydration suite |
| 包契约 | ESM runtime、声明文件、peer dependency、公开 export、包内容 | `npm run build:package` + `npm pack --dry-run` |
| 浏览器兼容 | 当前 evergreen Chromium；产品正式发布前覆盖其声明支持的 Firefox/WebKit/移动端 AT 组合 | 产品 release gate，不由源码单测替代 |

## 三个产品的迁移

1. 先发布 prerelease，并在一个低风险弹窗中用 adapter 保持旧 props；把原有标题、说明、Close 文案和业务 actions 移到 compound children，原 CSS 改挂公开 `className`。
2. 对每个产品记录其现有关闭策略、初始焦点和受控状态 owner，逐个迁移并运行该产品键盘、读屏语义、SSR/水合与视觉回归。行为差异通过明确的 `initialFocusRef` 或取消默认事件表达，不 fork primitive。
3. 第二个产品验证嵌套和 portal 宿主，第三个产品验证主题/长文案；prerelease 稳定后发布 `0.x`，保留旧 adapter 一个约定周期并给出弃用提示。
4. 全部调用点迁移且生产回归稳定后删除三个本地 focus/Escape/portal 实现及 adapter。回滚只需恢复单个产品的 adapter 版本，不与 primitive 删除在同一次发布完成。

维护命令：`npm run check` 运行类型、SSR、真实浏览器、应用构建和包构建；随后以 `npm pack --dry-run` 检查实际发布文件。新增部件前先确认它是否属于跨产品一致的模态行为，产品政策仍应留在调用侧。
