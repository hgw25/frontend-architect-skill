# Headless Dialog primitive

这个包提供 React 18.2–19 的模态 Dialog 行为，不携带产品文案、业务按钮或视觉样式。产品通过组合公开部件并传入普通 `className`、`style`、DOM 属性和 ref 来定义内容与外观。

## 公开 API

```tsx
import { Dialog } from 'frontend-architect-dialog-browser-eval'

<Dialog.Root open={open} onOpenChange={setOpen}>
  <Dialog.Trigger className="trigger">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="overlay">
      <Dialog.Content className="panel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* product fields and actions */}
        <Dialog.Close>Close</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

`Dialog.Root` 接受 `open`/`onOpenChange`，或用 `defaultOpen` 非受控运行。`onOpenChange` 的第二个参数给出 `trigger`、`close-button`、`escape-key` 或 `outside-pointer` 原因。`Dialog.Portal` 可用 `container` 指向自定义 portal 容器。`Dialog.Content` 支持 `initialFocusRef`、`restoreFocus` 和可阻止默认行为的 `onEscapeKeyDown`。所有 DOM 部件转发 ref 与原生属性，并暴露稳定的 `data-dialog-*`、`data-state` 样式 hooks。也可从包根直接导入 `DialogRoot` 等具名导出，以获得最小的 tree-shaking 边界。

每个 Content 必须组合一个 `Dialog.Title`；通常也组合 `Dialog.Description`。没有可见标题时，消费者应给 Content 提供 `aria-label`，并显式提供适合自己的说明关系。业务文案、操作按钮顺序、尺寸和主题均由产品组件拥有。

## 实现边界

- Root 仅拥有受控/非受控打开状态、稳定 ID 和触发器引用。
- Portal 只在客户端挂载后创建 DOM，因此服务端输出与首次水合一致，也不会访问 `document`。
- Content 注册模态层；内部 manager 按 `Document` 维护栈，只让最上层处理 Escape 和焦点约束，关闭后恢复该层打开前的焦点。
- manager 在首层打开时锁定页面滚动，并对模态分支之外的节点设置 `inert`/`aria-hidden`；最后一层关闭时准确恢复原值。
- Overlay 只处理自身的主指针按下，消费方可通过 `preventDefault()` 阻止关闭。Title/Description 只提供语义关联，不拥有内容。

## 发布与测试矩阵

包根 `exports` 只公开 ESM 运行时、声明文件和 `package.json`；React 与 React DOM 是 peer dependencies。`npm run build` 分别生成 `dist/package` 发布物和 `dist/demo` 示例。`npm run test:package` 从构建产物导入公开 API，并用 `npm pack --dry-run` 检查实际打包文件。

| 契约 | 自动化证据 | 发布矩阵 |
| --- | --- | --- |
| 类型、公开 props/ref | `npm run typecheck`、声明构建 | TS 5.9；包声明由 React 18.2–19 消费项目复验 |
| Node SSR、初始打开、无浏览器全局 | Vitest `Dialog.ssr.test.tsx` | Node 20/22 |
| 水合无 mismatch、portal、ARIA 名称/说明 | Playwright `dialog.spec.ts` | Chromium 每次变更；Firefox/WebKit 在发布 CI |
| 初始焦点、正反向焦点环、Escape、恢复焦点 | Playwright `dialog.spec.ts` | Chromium/Firefox/WebKit 发布 CI |
| 受控外层、非受控嵌套层、只关闭栈顶 | Playwright 示例行为 | React 18.2 与 19 发布 CI |
| 外部点击、背景 inert、滚动锁恢复 | Playwright `dialog.spec.ts` | 桌面浏览器发布 CI；产品补充移动端触控回归 |
| ESM、exports、声明与 pack 内容 | `npm run build && npm run test:package` | 支持的 Node/package manager 组合 |

本 fixture 实际执行 Chromium；表中“发布 CI”项目是发布前必须补齐的兼容矩阵，不能由本地单浏览器结果替代。

## 三个产品的迁移方案

1. 先发布 prerelease，冻结上述交互契约。每个产品在自己的模块内保留旧 Dialog 名称，建立一个薄适配器，把原有 `title`、`description`、trigger 和 actions 组合成 primitive；产品样式只改为公开 class/data hooks。这样不要求三个产品同步改调用点，也不把旧业务 API 放进基础包。
2. 逐个产品迁移。先迁最简单的非受控弹窗，再迁受控流程，最后迁包含二级弹窗的产品；每次用该产品原有文案、按钮、埋点与关闭策略跑键盘、焦点恢复和视觉回归。需要自定义首焦点时使用 `initialFocusRef`，不要在产品里再装一套全局 keydown/focus trap。
3. 每个产品稳定一个发布周期后删除其适配器和旧实现。若需要回滚，只回退该产品到适配器版本；基础包与其他产品不回滚。三个产品都完成并通过跨浏览器发布矩阵后，再发布稳定主版本并停止旧实现维护。

现实的后续变化（例如新增 `AlertDialog`）应复用内部模态层管理，但单独定义不可外点关闭、取消/确认语义和初始焦点策略；不要给当前 Dialog 追加一组互相影响的布尔开关。
