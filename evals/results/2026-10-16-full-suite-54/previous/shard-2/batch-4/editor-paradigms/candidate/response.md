结论：采用“函数式核心 + 命令式外壳”的混合设计。文档变换、selection 映射、history 和纯文本转换保持为纯数据/纯函数；连接流程用状态机；DOM 订阅用闭包；编辑会话和协作连接用组合式类管理稳定身份与资源生命周期。不要让 React/Vue 状态、DOM、编辑器模型和协作模型同时持有同一份文档。

工作区没有业务源码或框架配置，因此以下是框架无关设计，没有修改文件。

## 总体结构

```text
DOM / 键盘 / 粘贴 / 网络
           │
           ▼
    EditorSession（资源与顺序）
           │
           ▼
 transition(state, event)（纯）
           │
     ┌─────┴─────┐
     ▼           ▼
新快照/通知    Effect 描述
                 │
                 ▼
        DOMBinding / CollaborationSession
```

建议模块：

```text
editor/
  model.ts                  # 文档、selection、transaction 类型
  transitions.ts            # 文档变换和 selection 映射
  reducer.ts                # 编辑器原子状态转换
  history.ts                # undo/redo 和分组规则
  plain-text.ts             # 纯文本导入导出
  dom-binding.ts            # DOM 事件、selection 同步
  collaboration-machine.ts  # 连接状态机
  collaboration-session.ts  # socket/provider 生命周期
  editor-session.ts         # 对外门面与总生命周期
  index.ts                  # 窄公共接口
```

## 范式选择

| 部分 | 选择 | 理由 |
|---|---|---|
| 文档 transaction | 纯函数 | 相同文档和 transaction 必须产生相同结果，方便测试、回放和协作转换 |
| selection 映射 | 纯函数 | selection 是模型位置；每次文档变更后确定性映射 |
| 纯文本转换 | 纯函数 | 无资源和身份，适合确定性输入输出 |
| history | Reducer + 纯函数 | undo、redo、合并输入必须是可检查的显式转换 |
| 编辑器本地状态 | Reducer | 文档、selection、history 需要原子更新，避免多个 store 短暂不一致 |
| 协作连接流程 | 状态机 | connecting、syncing、online、retrying 等状态存在明确的合法/非法转换 |
| DOM 订阅 | 闭包 | 捕获 root、监听器、AbortController，返回局部 disposer 即可 |
| 编辑会话 | 类 | 有稳定身份，并拥有订阅、连接、调度队列和销毁过程 |
| 协作 transport | 类或第三方适配器 | WebSocket/provider 是有身份的外部资源；使用组合，不用继承 |

`EditorSession` 不负责实现所有逻辑。它只是组合 reducer、DOM binding 和 collaboration session，并规定事件顺序和资源所有权。

## 核心状态及所有权

```ts
type EditorState = {
  document: EditorDocument
  selection: ModelSelection | null
  history: HistoryState
  revision: number
}

type ConnectionState =
  | { type: 'idle' }
  | { type: 'connecting'; generation: number; attempt: number }
  | { type: 'syncing'; generation: number; checkpoint: string }
  | { type: 'online'; generation: number; sessionId: string }
  | { type: 'retrying'; generation: number; attempt: number }
  | { type: 'failed'; generation: number; recoverable: boolean }
  | { type: 'disposed' }
```

所有权规则：

- `EditorSession` 中的 reducer/store 是本地编辑状态唯一写入口。
- selection 使用模型位置，例如 `path + offset` 或协作引擎的 relative position；不得保存 `Range`、`Node` 等 DOM 对象。
- DOM 是文档状态的投影，不是第二份文档真相。
- history 只记录本地可撤销意图，不进入共享文档，也不发送给其他用户。
- `CollaborationSession` 独占自己的 socket/provider、重连定时器、握手请求和未确认队列。
- 服务端负责已接受版本、权限和跨客户端顺序；客户端不能用本地队列替代这些保证。
- UI 框架只订阅 session 快照，不再复制一份可独立修改的 editor state。

如果采用 CRDT 库，则 CRDT document 应成为文档真相，reducer 只保存其可发布快照、revision 和本地 UI 状态；不能同时维护一份独立 JSON 文档。history 也应优先使用该 CRDT 的 local-origin undo manager。

## Selection

建议使用带类型的模型 selection：

```ts
type ModelSelection =
  | { type: 'text'; anchor: ModelPoint; head: ModelPoint }
  | { type: 'node'; nodeId: string }
  | { type: 'all' }
```

适合纯函数的操作包括：

```ts
mapSelection(selection, transaction): ModelSelection | null
normalizeSelection(document, selection): ModelSelection | null
isSelectionEqual(a, b): boolean
```

DOM adapter 只做两种转换：

```ts
domSelectionToModel(root, domSelection, revision)
modelSelectionToDOM(root, modelSelection, revision)
```

从 DOM 收到的 selection 事件必须携带它观察到的 `revision`。如果对应文档已经变化，先通过 transaction map/CRDT anchor 重定位；无法重定位时清空或恢复到最近合法位置，而不是应用旧 offset。

程序化设置 DOM selection 时使用短生命周期的 origin 标记，并做相等性检查，避免：

```text
模型更新 → 设置 DOM selection → selectionchange → 再次写模型
```

IME composition 是独立的临时交互状态。不要在合成期间用普通 DOM diff 强行重写组合节点；远程 transaction 应由编辑器引擎映射或延迟到安全的 composition 边界。

## History

history 适合 reducer，不适合保存整页 DOM 快照：

```ts
type HistoryEntry = {
  forward: Transaction
  inverse: Transaction
  beforeSelection: ModelSelection | null
  afterSelection: ModelSelection | null
  groupId: string
  origin: 'local'
}
```

基本规则：

- selection-only 事件不创建 undo 项。
- 新的本地编辑清空 redo。
- 连续输入是否合并由显式 transaction 边界、时间和输入类型共同决定；粘贴、换段、格式命令通常单独成组。
- 远程编辑不进入本地 undo 栈。
- undo 产生一个新的本地 inverse transaction，而不是把文档恢复为旧快照。
- 远程 transaction 到达后，尚未使用的 inverse steps 必须通过 OT step map 或 CRDT undo 机制重定位。
- history 默认不持久化、不协作同步；若未来需要崩溃恢复，应单独定义带版本的恢复格式。

## 纯文本转换

```ts
toPlainText(document, policy): string
fromPlainText(text, policy, idFactory): EditorDocument
```

它们应为纯函数。`policy` 必须明确：

- 段落和 hard break 的换行规则；
- 列表是否带标记；
- 表格单元格分隔方式；
- 图片使用 alt text、占位符还是忽略；
- mention、附件和自定义节点的降级方式。

纯文本是有损格式，不能作为富文本文档的持久化格式，也不承诺：

```text
fromPlainText(toPlainText(document)) === document
```

不要通过 `contenteditable.innerText` 实现核心转换；它会把浏览器 DOM 行为混入领域规则。

## 协作状态机与竞态

连接状态机建议：

```text
idle
  └─ connect ─> connecting
                   ├─ transport ready ─> syncing ─> online
                   ├─ transient failure ─> retrying ─┐
                   └─ fatal/auth failure ─> failed  │
                                                     └─ connecting
任意非终态 ── dispose ──> disposed
```

每次连接或替换连接时递增 `generation`。所有 socket 回调、握手响应、重连定时器和 acknowledgement 都必须携带 generation；旧 generation 的成功、失败和清理都不得发布状态。

文档编辑不能使用“最后响应获胜”策略。正确策略是：

1. 本地 transaction 立即应用并获得稳定 `operationId`。
2. 按协议加入 outbox。
3. 重连时用同一个 operation ID 重发。
4. 服务端或 provider 必须支持去重、版本/因果顺序以及冲突合并。
5. acknowledgement 只更新确认元数据，不能用旧响应覆盖当前文档。
6. 远程 transaction 必须通过 OT 或 CRDT 与未确认的本地 transaction 合并。

Presence、远程光标和“正在输入”状态可以 latest-wins，因为中间状态可以丢弃；文档编辑不可以。

初始同步还需要一个明确屏障：

```text
取得 checkpoint V
→ 缓冲 V 之后的增量
→ 安装 checkpoint
→ 按协议应用增量
→ 进入 online
```

这个流程依赖服务端提供无缺口的游标/版本或 CRDT 同步协议。若服务端没有该保证，客户端缓冲无法自行补出可靠协作。

## DOM 订阅与闭包

DOM binding 适合返回幂等 disposer：

```ts
function bindEditorDOM(
  root: HTMLElement,
  dispatch: (event: EditorEvent) => void,
  getSnapshot: () => EditorSnapshot,
): () => void
```

闭包持有：

- 当前 root；
- listener 函数引用；
- `AbortController`；
- 必需的 observer；
- binding token；
- composition 状态。

disposer 只能释放这一次绑定。旧 root 的 disposer 必须检查 binding token，不能意外解除后来替换的新绑定。

除非接入无法控制的 legacy `contenteditable`，不要把 `MutationObserver` 当作常规数据同步机制；优先从 `beforeinput`、selection、composition 和编辑器命令生成 transaction。

## 类和公共接口

```ts
class EditorSession {
  getSnapshot(): EditorSnapshot
  subscribe(listener: () => void): () => void

  dispatch(command: EditorCommand): void
  attachDOM(root: HTMLElement): () => void

  connect(options: CollaborationOptions): void
  disconnect(): void

  exportPlainText(policy?: PlainTextPolicy): string

  shutdown(options: { deadlineMs: number }): Promise<void>
  dispose(): void
}
```

关键约束：

- `dispatch` 是文档与 selection 的唯一写入口。
- 内部用同步事件队列防止订阅者重入导致转换交错。
- reducer 完成提交并发布快照后，才执行网络或 DOM effect。
- 异步完成结果重新变成带 operation ID/generation 的事件进入队列。
- 类之间使用组合；不需要 `BaseEditor` 或 transport 继承树。
- 框架 hook/composable 只负责创建、订阅和清理 session，不重新拥有其状态。

## 序列化边界

长期文档格式只包含稳定值：

```ts
type PersistedDocument = {
  schemaVersion: number
  document: EditorDocument
}
```

不应序列化进文档：

- DOM Node、Range、observer；
- WebSocket、AbortController、timer；
- listener 和函数；
- connection 状态；
- undo/redo 栈；
- 本地 selection；
- presence；
- 临时 composition 状态。

协作协议另行版本化，例如 `protocolVersion`、`documentId`、`operationId`、`baseVersion` 和 payload。外部载入的文档、粘贴内容和远程 operation 在入口验证一次，进入内部模型后依赖已验证契约。

若需要恢复未发送编辑，持久化的应是“服务端 checkpoint/version + 带稳定 ID 的 outbox”，而不是随意序列化整个运行时 session。

## 销毁边界

`dispose()` 应幂等，并按以下顺序执行：

1. 将 session 标记为 disposed 并递增 generation，先阻止任何旧回调发布。
2. 停止新命令和通知；后续公共命令抛出明确的 `DisposedSessionError`。
3. 解除 DOM listeners、observer、composition 和调度任务。
4. 取消握手、重连 timer 和 transport 订阅。
5. 只关闭 session 独占的连接；共享 provider 仅移除当前订阅。
6. 清空 listener 引用和不可恢复的运行时缓存。

不要让 `dispose()` 隐式等待网络保存。需要可靠离开流程时，显式调用有截止时间的 `shutdown()`；超时后的未知结果必须保留为未确认状态。浏览器卸载期间的 best-effort 发送不能被描述为可靠保存。

## 必须验证的高价值行为

- 文档 transaction 后 selection 能正确前移、后移和失效。
- 本地 undo 不会撤销远程用户的编辑。
- `A 连接 → B 替换 → A 迟到失败/成功` 不改变 B 的状态。
- 重连不会生成重复编辑，旧 acknowledgement 不覆盖新编辑。
- 初始 snapshot 和同步期间增量没有缺口或重复。
- DOM 重新绑定后，旧 disposer 不会解除新 root。
- 重复 `dispose()` 安全，dispose 后没有 DOM 或网络回调发布。
- IME、粘贴、撤销和远程编辑在真实浏览器中保持 selection 与文档一致。

最终需要在接入具体项目时确认的唯一重大前置契约，是协作后端采用 OT、CRDT 还是单调版本操作协议。它决定 transaction 重定位、undo 与 outbox 的具体实现，但不改变上述状态和生命周期边界。