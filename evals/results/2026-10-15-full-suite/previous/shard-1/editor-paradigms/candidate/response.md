仓库中没有应用源码、框架配置或包清单，只有指定的 `.frontend-architect` 指引。因此下面给出框架无关的 TypeScript 模块设计，不假设 React/Vue，也不虚构已有编辑器或协作协议；本次不修改文件。

## 总体选择

采用“纯函数核心 + 命令式资源外壳”，但不把整个模块强行做成纯 FP 或纯 OOP。

| 部分 | 推荐范式 | 核心理由 |
| --- | --- | --- |
| 文档变换、selection 映射 | 纯函数 | 相同输入得到相同结果，便于测试、重放和协作 rebase |
| 编辑事务与 history | Reducer | 转移显式、可记录；撤销重做适合事件驱动 |
| 协作连接状态 | 状态机 | 合法状态、重连、同步、关闭存在明确约束 |
| DOM 订阅 | 闭包适配器 | 局部资源，只需捕获监听器并返回 disposer |
| WebSocket/协作 Provider | 类 | 有稳定身份、私有可变状态、计时器和资源生命周期 |
| 编辑器总协调 | 工厂函数/框架生命周期 | 负责组装而不重新拥有所有子模块状态 |
| 纯文本转换 | 纯函数 | 是确定性的有损转换，不需要对象身份 |
| 销毁 | 各资源自行清理，由 session 汇总 | 避免一个 God Object 知道全部实现细节 |

## 建议边界

```text
editor/
  model/
    document          文档节点、事务、纯变换
    selection         逻辑 selection、映射与规范化
    history           undo/redo reducer
    plainText         富文本与纯文本的显式有损转换
  dom/
    bindEditorDom     DOM 事件、Selection/Range 映射、IME
  collaboration/
    connection        连接资源类
    connectionMachine 纯状态机转移
    protocol          外部消息验证与协议映射
  session/
    createEditorSession 组装命令、订阅与清理
  index               窄公共 API
```

实际落地时不必为每项建立目录；只有内容足以形成边界时才拆分。

## 1. 文档与 selection：纯数据和纯函数

selection 不应保存 `Node`、`Range` 或 DOM offset。它应引用编辑器文档中的逻辑位置：

```ts
type TextPoint = {
  blockId: string
  offset: number
  affinity?: 'before' | 'after'
}

type EditorSelection =
  | { kind: 'caret'; point: TextPoint }
  | { kind: 'range'; anchor: TextPoint; focus: TextPoint }
  | { kind: 'node'; nodeId: string }
```

主要操作保持纯粹：

```ts
applyTransaction(snapshot, transaction)
mapSelection(selection, documentChange)
normalizeSelection(document, selection)
domSelectionToModel(root, nativeSelection)
modelSelectionToDom(root, selection)
```

其中前面三个属于 model；后面两个虽然计算部分可以纯化，但读取、设置真实 DOM 必须留在 DOM 适配器中。

状态所有权：

- 文档工作副本由 editor session/store 拥有，并且只能通过事务入口修改。
- selection 属于具体编辑视图，而不是共享文档。一个文档开两个编辑视图时，它们可以有不同光标。
- 远端光标是协作 presence 数据，不能混入本地 selection。
- DOM Selection 只是投影，不是第二份真相。

## 2. History：独立 Reducer

history 适合 reducer，而不是让 `Editor` 类暗中维护两个数组：

```ts
type HistoryState = {
  undo: HistoryEntry[]
  redo: HistoryEntry[]
  group?: HistoryGroup
}

type HistoryEvent =
  | { type: 'local-applied'; transaction: AppliedTransaction }
  | { type: 'remote-applied'; mapping: PositionMapping }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'clear' }
```

关键规则：

- 只把本地可撤销事务加入当前用户的 history。
- 远端编辑不进入本地 undo 栈，但必须映射/rebase 栈内位置。
- undo 是生成一个新的逆事务，不是直接恢复旧快照。
- 输入合并依据明确元数据，例如输入来源、时间窗口和 selection 连续性；不要散落在 UI 事件处理器中。
- 新的本地编辑会清空 redo；远端事务通常不会。
- IME composition 应作为一个 history group，而不是每个 composition update 一条记录。

如果最终选用的编辑器内核已经提供可靠的 transaction/history 插件，应复用它，而不是实现平行 history。

## 3. 纯文本转换：纯函数，但明确有损语义

```ts
extractPlainText(document, options): string
parsePlainText(text, policy): DocumentNode
```

两者不是互逆序列化：

- `extractPlainText` 会丢失 mark、链接、批注等结构。
- 应明确段落、列表、硬换行、嵌入节点的转换规则。
- `parsePlainText` 只构造受支持的文档节点，不把文本解释成 HTML。
- 用于持久化和协作的格式应是版本化文档 JSON 或操作协议，不能用纯文本替代。

## 4. DOM 订阅：闭包适配器

DOM 绑定是局部生命周期，闭包比类更直接：

```ts
function bindEditorDom(options: {
  root: HTMLElement
  dispatch: (event: EditorInputEvent) => void
  getSnapshot: () => EditorViewSnapshot
}): () => void
```

它负责：

- `beforeinput`、键盘、paste、selectionchange；
- `compositionstart/update/end`；
- `MutationObserver`——仅在编辑策略确实需要时；
- 将浏览器事件翻译为领域事件；
- 将所有监听器引用捕获在闭包中；
- 返回幂等、只清理本次绑定的 disposer。

不要让 DOM 回调直接修改文档，再由 reducer“同步”。执行路径应是：

```text
DOM event → domain event → transaction/reducer → new snapshot → DOM projection
```

更新 DOM selection 时要比较当前投影或标记更新来源，避免程序化 selection 更新再次触发等价事务。

## 5. 协作连接：类包住资源，内部使用状态机

连接具有稳定身份、socket、重连计时器、pending 队列，因此类是合理选择：

```ts
class CollaborationConnection {
  connect(): void
  send(operation: LocalOperation): void
  subscribe(listener: ConnectionListener): () => void
  close(): void
}
```

类内部不应靠任意布尔组合表达状态，而应调用纯状态机：

```text
idle
  → connecting
  → syncing
  → online
  → reconnecting
  → syncing
  → online

任意非 closed 状态 → closed
```

`closed` 是终态；关闭后旧 socket 的 `open/message/error/finally` 都不能重新发布状态。

连接类拥有：

- socket 或 provider 实例；
- 重连计时器和退避次数；
- 当前连接 generation；
- 未确认操作队列；
- 协议消息解析和外部输入验证。

它不拥有：

- 编辑器 DOM；
- 本地 selection；
- history；
- UI 通知；
- 文档渲染。

## 状态所有权与序列化

| 数据 | 所有者 | 是否序列化 |
| --- | --- | --- |
| 文档工作投影 | editor session/store | 是，使用带 `schemaVersion` 的文档格式 |
| 逻辑 selection | editor view | 可选；恢复或 presence 时使用逻辑位置 |
| DOM `Range`/节点 | DOM adapter | 否 |
| undo/redo | history reducer | 默认不跨会话、不上传 |
| 未确认本地操作 | collaboration workflow | 协议消息需要序列化；内存队列本身不直接序列化 |
| 远端 presence | collaboration presence store | 可传输，但不进入文档 |
| socket、timer、AbortController | connection | 否 |
| connection 状态 | connection state machine | 可记录诊断，不作为恢复资源的快照 |

所有跨网络或存储的数据都使用普通值，并带文档/协议版本。反序列化时在边界验证，内部 reducer 可以依赖已验证契约。

## 竞态策略

不能用一种“取消旧请求”处理所有异步行为。

1. 本地操作必须有序

   每个操作携带 `clientId`、单调 `clientSeq`、`operationId` 和协议要求的 base version。发送队列按序处理；重试依赖服务端去重或所选 CRDT/OT 协议，不能假设超时等于失败。

2. 初始同步与本地编辑并发

   同步期间产生的本地操作进入 pending 队列。权威快照回来后：

   ```text
   authoritative snapshot
       + rebase/replay still-pending local operations
       = visible working projection
   ```

   不能让迟到的快照直接覆盖用户已经输入的内容。

3. 重连响应过期

   每次连接或同步分配 generation。success、error、finally 发布前都检查 generation 和 `disposed`；仅 abort socket 不足以证明旧回调不会执行。

4. IME 与远端更新

   composition 期间不能随意重建正在输入的 DOM。具体采用“重映射 composing range”还是“缓冲远端 DOM 投影到 compositionend”，应由编辑器内核能力决定，但策略必须集中在 DOM/session 边界。

5. acknowledgement 与撤销

   undo/redo 生成正常的协作事务。服务器 ack 只确认对应 `operationId`，不能用旧 ack 中的整个文档覆盖当前投影。

如果服务端没有版本、OT 或 CRDT 等冲突协议，客户端模块不能声称已经实现可靠多人协作；这是必须明确的外部契约。

## 生命周期与销毁

建议 `createEditorSession` 返回一个小型 handle：

```ts
interface EditorSession {
  getSnapshot(): EditorSnapshot
  dispatch(command: EditorCommand): void
  subscribe(listener: EditorListener): () => void
  destroy(): void
}
```

`destroy()` 必须幂等，并按以下原则处理：

1. 先标记 disposed，拒绝新命令和异步发布。
2. 移除 DOM、selection、observer 等视图订阅。
3. 停止重连计时器并取消正在进行的同步。
4. 注销协作消息和 presence 订阅。
5. 关闭该 session 独占的连接。
6. 清空外部监听器和不可再投递的队列。

如果连接由多个编辑器共享，session 只能释放自己的订阅或租约，不能在一个视图卸载时关闭公共连接。每个子资源应清理自己创建的资源，session 只汇总 disposer，不深入操作它们的私有字段。

## 最终判断

不要建立一个同时持有 DOM、文档、history、socket 和所有异步状态的 `EditorManager`。推荐组合是：

- 纯函数承担文档、selection 和纯文本转换；
- Reducer 承担可重放的编辑与 history 转移；
- 状态机规定协作连接的合法生命周期；
- 闭包拥有局部 DOM 订阅；
- 类拥有长期存在的网络资源和不变量；
- session 只负责组装、命令路由与幂等销毁。

这也为一个现实后续变化保留了局部修改路径：将 WebSocket 协议替换为 CRDT provider 时，主要替换 `collaboration` 边界；文档转换、DOM 订阅、selection 和公开 session API 无需随之重写。