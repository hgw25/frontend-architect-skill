# Headless Dialog primitive

这是一个面向多个 React 产品的无样式模态 Dialog。primitive 只统一状态、语义、焦点与分层行为；标题文案、说明、表单、业务操作和视觉样式都由产品组合。当前示例的 “Edit profile”、输入框、嵌套权限弹窗和 Close 行为保持不变。

## 公开 API

包入口 `@example/headless-dialog` 同时导出 compound API `Dialog.*` 和对应的具名组件/Props 类型：

```tsx
<Dialog.Root defaultOpen={false} onOpenChange={setOpen}>
  <Dialog.Trigger className="productButton">Edit profile</Dialog.Trigger>
  <Dialog.Portal>
    <Dialog.Overlay className="productOverlay">
      <Dialog.Content className="productPanel">
        <Dialog.Title>Edit profile</Dialog.Title>
        <Dialog.Description>Update your public information.</Dialog.Description>
        {/* product form and actions */}
        <Dialog.Close>Close</Dialog.Close>
      </Dialog.Content>
    </Dialog.Overlay>
  </Dialog.Portal>
</Dialog.Root>
```

- `Root`: `open` + `onOpenChange` 为受控模式；`defaultOpen` 为非受控模式。两种模式共享相同的关闭路径。
- `Trigger` / `Close`: 原生 `button` 属性与 ref，消费者的事件先执行；`preventDefault()` 可取消 primitive 的状态变化。
- `Portal`: 默认挂到 `document.body`，也接受 `container`；`null` 表示容器尚未就绪。服务端不访问 DOM，水合完成后才挂载 portal。
- `Overlay` / `Content`: 转发原生属性、`className`、`style` 和 ref，并提供 `data-state="open"` 样式钩子。点击最上层 backdrop 才关闭。
- `Content`: 固定 `role="dialog"` 与 `aria-modal="true"`；默认通过 `Title`、`Description` 的稳定 `useId` 建立标注，也可用 `aria-label` 或显式 ARIA 引用。`initialFocusRef` 可覆盖默认的首个可聚焦元素。
- `Title` / `Description`: 分别渲染无样式 `h2` / `p`，只承担可访问名称和说明关系。

`Dialog`, 所有具名部件和 Props 类型只从包根入口发布；焦点算法、层栈和背景隔离均为内部实现，不允许产品依赖内部 DOM 或文件路径。React 与 React DOM 是 `>=18.2 <20` 的 peer contract，产物为 tree-shakeable ESM 与类型声明。

## 核心实现边界

`Root` 是 open 状态的唯一所有者。每个 `Content` 打开时向其 `ownerDocument` 的内部层栈注册：只有栈顶响应 Escape、backdrop 和焦点约束；关闭时先恢复下一层的可交互状态，再把焦点还给本层打开前的元素。栈顶以外的 DOM 分支临时设置 `inert` 和 `aria-hidden`，原值在层变化或卸载时恢复。

Portal 采用“服务端与首次客户端渲染都为空，effect 后挂载”的边界，因此 `defaultOpen` 和受控 `open` 不会在水合时制造不同 DOM。该选择意味着服务端 HTML 包含 trigger 状态但不包含 portal 内容；需要首屏静态可见内容的场景不应使用模态 Dialog 承载。

primitive 不拥有滚动策略、动画、尺寸、颜色、文案、按钮排列或业务确认逻辑。当前样式仅在示例的 `styles.css` 中，消费者可以用普通 CSS、CSS Modules、CSS-in-JS 或设计系统 class 覆盖，而无需选择 primitive 变体。

## 测试矩阵

| 契约 | 自动化证据 | 发布门禁 |
| --- | --- | --- |
| 受控打开、首焦点、正反向 Tab 循环、Escape、焦点恢复 | Playwright / Chromium | `npm run test:browser` |
| 非受控嵌套时仅顶层 Escape、子层关闭后恢复本地 trigger | Playwright / Chromium | `npm run test:browser` |
| portal 位置、ARIA 名称/说明、背景隔离、程序化焦点逃逸、backdrop | Playwright / Chromium | `npm run test:browser` |
| SSR 不访问 browser global、关闭与 `defaultOpen` 输出稳定 | Vitest / Node renderer | `npm run test:ssr` |
| 实际服务端标记水合且无控制台 mismatch | Vite 的 HTML SSR fixture + Playwright | `npm run test:browser` |
| DOM/ref Props 与包根类型出口 | TypeScript + library build/declarations | `npm run typecheck && npm run build` |

发布到声明支持的更多浏览器前，应把同一 Playwright 契约扩到 Firefox/WebKit；当前包只以 fixture 实际运行的 Chromium 作为浏览器证据，不夸大兼容范围。

## 三个产品的增量迁移

1. 在每个产品保留原有业务 `ProductDialog` 名称，先把内部实现适配到这些 primitives；将旧的 title/description/trigger 参数在适配层展开成 `Title`、`Description`、`Trigger`，不把旧 API 固化进基础包。
2. 逐个迁移实例并跑该产品的键盘主路径。第一批覆盖普通表单，第二批覆盖受控弹窗，最后迁移嵌套弹窗；每批均保留旧实现作为可回退提交，不同时重写业务动作。
3. 将产品样式移到各自的 Overlay/Content class，先做等价视觉验收，再独立演进主题。对必须自定义 portal 容器的壳层显式传 `container`。
4. 三个产品都不再直接使用旧实现后，删除适配层和旧焦点/Escape 监听器；在一个 major 版本移除旧入口，并在变更日志给出上面的组合示例与回退版本。

发布前执行 `npm run check`，并从生成的包根入口做一次消费安装检查；高风险迁移先使用 prerelease 版本，让三个产品可独立回退。
