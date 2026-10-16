建议采用“函数式核心 + 命令式外壳”：编辑文档、selection 映射、history 和文本转换保持为纯数据转换；DOM 与网络资源由明确的生命周期对象管理。不要让一个 `Editor` 大类同时承担模型、渲染、连接和历史职责。

工作区目前没有应用源码、框架或包管理配置，因此以下是框架无关的模块设计，没有虚构 React/Vue 或具体编辑器引擎，也未修改任何文件。

## 范式分配

| 能力 | 表达方式 | 原因 |
| --- | --- | --- |
| 文档操作、selection 映射 | 纯函数 | 输入 transaction 和旧状态，确定地产生新状态，便于重放与协作变换 |
| 编辑状态、history | Reducer | 所有同步状态变化集中，能明确区分本地、远端、撤销和重置 |
| 纯文本转换、序列化 | 纯函数 | 无需身份和生命周期，适合 fixture、属性测试和版本迁移 |
| 协作连接状态 | 状态机 | 连接、同步、重连、失效之间存在非法转换和异步竞态 |
| DOM 订阅 | 闭包式 adapter | 捕获 DOM 节点和监听器引用，返回幂等 disposer 即可 |
| 会话与连接资源 | 小型类 | 有稳定身份、私有可变资源、构造到销毁的完整生命周期 |
| UI 组件 | 框架原生组件/hook | 只订阅 session 快照、转发命令，不重新拥有编辑状态 |

推荐目录边界：

```text
editor/
  model/
    types.ts
    transactions.ts       # 纯操作及 selection 映射
    reducer.ts            # 文档、selection、history 转换
    serialization.ts
    plain-text.ts
  dom/
    createDOMBinding.ts
  collaboration/
    CollaborationController.ts
    protocol.ts
  EditorSession.ts
  index.ts
```

如果项目随后采用 ProseMirror、Lexical、Slate 等成熟引擎，应直接复用其 transaction、selection 和 history 模型；上述模块作为宿主边界，不再平行实现第二套编辑模型。

## 状态所有权

唯一的文档真相放在 `EditorSession` 内，由纯 reducer 更新：

```ts
type EditorState = {
  document: DocumentNode
  selection: ModelSelection | null
  history: HistoryState
  revision: number
}

type ModelSelection = {
  anchor: { nodeId: string; offset: number }
  focus: { nodeId: string; offset: number }
  affinity?: "forward" | "backward"
}
```

关键约束：

- `DocumentNode` 是普通可序列化数据，节点使用稳定 ID。
- `Selection` 保存模型位置，不保存 `Range`、`Node` 等 DOM 对象；是否折叠、方向等可推导值不重复存储。
- `HistoryState` 由 reducer 独占，DOM adapter 和协作控制器都不能直接改它。
- `CollaborationController` 只拥有连接状态、协议 revision、未确认操作和重连计时器，不拥有文档副本。
- DOM binding 只拥有监听器、observer 和 DOM 到模型位置的映射缓存，不拥有编辑内容。
- UI 可以组合出 `{editorState, connectionState}` 快照，但不能形成第二个可写 store。

推荐 reducer 入口：

```ts
type EditorCommand =
  | { type: "apply-local"; transaction: Transaction }
  | { type: "apply-remote"; transaction: Transaction; revision: number }
  | { type: "set-selection"; selection: ModelSelection | null }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "reset"; document: DocumentNode; revision: number }

type TransitionResult = {
  state: EditorState
  outbound: readonly Transaction[]
}
```

Reducer 可以描述需要发送的本地 transaction，但不能直接访问 WebSocket 或 DOM；`EditorSession` 在提交新状态后执行 `outbound`。

## Selection 与 history

Selection 分为三层：

1. `ModelSelection`：编辑器状态中的权威表示。
2. `DOM Selection/Range`：浏览器瞬时投影。
3. 远端用户光标：presence 数据，不写入本地 selection 或 history。

每次文档 transaction 都通过纯函数映射 selection：

```ts
mapSelection(selection, transaction): ModelSelection | null
```

目标节点被删除时，按编辑器规则落到最近合法位置，而不是保留失效 DOM 引用。

History 保存可逆 transaction 或 inverse operation，不保存 HTML/DOM 快照。规则应为：

- 连续输入可以按用户意图分组。
- 光标移动不单独产生 undo 项。
- IME composition 作为一个历史单元提交。
- 新本地编辑清空 redo。
- 远端编辑更新当前文档，并映射已有 undo/redo 操作。
- 协作模式下，undo 是“提交一个本地逆操作”，不是把共享文档回滚到旧快照。

最后一点通常依赖编辑引擎的 OT/CRDT 能力；不要自行拼一个仅按数组下标回退的协作 history。

## DOM 订阅

`createDOMBinding(root, session)` 使用闭包，返回幂等清理函数：

```ts
type DOMBinding = {
  render(snapshot: Readonly<EditorState>): void
  dispose(): void
}
```

它负责：

- 注册并移除 `beforeinput`、`selectionchange`、composition、paste 等监听器。
- 对 document 级 `selectionchange` 过滤不属于当前根节点的事件。
- 把 DOM 事件翻译成编辑命令。
- 把模型 selection 投影为 DOM Range。
- 在 composition 期间保留浏览器的临时输入状态，在 composition end 时形成一个 transaction。
- 如确实需要 `MutationObserver`，它用于发现外部 DOM 改写或兼容性回退，不把 DOM 反向升级为文档真相。

应防止“模型渲染 DOM → selectionchange → 再次派发”的反馈环，但这个标记只属于 binding，不进入领域状态。

## 协作状态机与竞态

建议使用判别联合或显式状态机：

```text
idle → connecting → syncing → online
          │            │         │
          └────────→ reconnecting ┘
任何非终态 → fatal
任何非终态 → closed
```

主要策略：

- `syncing` 完成前默认只读。离线编辑若是明确产品需求，再增加 outbox、重放和 rebase，而不是默默接受可能丢失的修改。
- 每个本地操作携带 `clientOpId`、`baseRevision`；发送保持顺序。
- 服务端按稳定操作 ID 保证重试幂等；网络超时不等于写入失败。
- ack 只能确认对应操作，不能用“最后返回的请求”猜测。
- 远端 revision 出现缺口时暂停应用并请求补齐或全量重同步。
- 所有文档事件进入同一个串行 dispatch 队列，避免 DOM、ack 和远端消息同时修改状态。
- 每次 connect/reconnect 生成 `connectionGeneration`。旧 socket 的成功、失败和 `finally` 回调都必须验证 generation，不能覆盖新连接状态。
- Abort/close 用于节省资源；generation/revision 检查才负责阻止过期结果发布。

协作算法本身应由既有后端协议或成熟 OT/CRDT provider 决定。一个泛化的 `CollaborationAdapter` 只能隐藏传输差异，不能伪造服务端排序、冲突合并或幂等保证。

## 序列化边界

持久化和网络交换只使用带版本的普通数据：

```ts
type SerializedDocument = {
  schemaVersion: number
  document: DocumentNode
  revision?: number
}
```

具体规则：

- `serialize`、`deserialize`、schema migration 是纯函数。
- 外部载入的数据在边界校验一次；内部 reducer 依赖已验证契约。
- HTML 不是权威存储格式。导入 HTML 必须经过解析和净化，导出 HTML 是派生能力。
- 纯文本是有损视图：明确段落、换行、列表、图片替代文本等规则，不支持从纯文本无损恢复富文本。
- selection 可作为独立的会话恢复数据保存，但载入后必须针对当前文档 revision 重新映射或丢弃。
- history 默认不持久化，也不跨协作者传输；若需要崩溃恢复，应作为单独协议设计。
- DOM 节点、connection、AbortController、timer、listener 和类实例永不序列化。

## 生命周期与销毁

`EditorSession` 是组合根，但只负责协调：

```ts
class EditorSession {
  attach(root: HTMLElement): () => void
  connect(adapter: CollaborationAdapter): void
  dispatch(command: EditorCommand): void
  subscribe(listener: Listener): () => void
  destroy(): void
}
```

`destroy()` 必须幂等，并形成终态：

1. 标记 session 已销毁并递增 generation。
2. 移除 DOM listeners、observer 和框架订阅。
3. 取消握手、重连 timer 和待发布回调。
4. 释放 session 独占的 socket/provider。
5. 若连接是共享借用的，只 unsubscribe，不关闭共享资源。
6. 清空 subscriber 和 DOM 引用，避免节点被闭包长期持有。
7. 丢弃后续 DOM、网络和 ack 事件；销毁后 `dispatch/connect/attach` 明确抛错或返回失败，不能静默复活。

切换文档身份时，应按一次“资源替换”处理：使旧 generation 失效、断开旧协作订阅、清空旧 history，再载入新文档。不能让旧文档的延迟 ack 写入新文档。

## 最重要的验证

- 纯函数：序列化往返、schema migration、纯文本 fixtures、节点删除后的 selection 映射。
- Reducer：输入→撤销→远端编辑→重做，以及 composition 分组。
- 状态机：旧连接在新连接成功后才报错、revision 缺口、重复 ack、重连重发。
- 浏览器：跨节点 selection、IME、粘贴、外部 DOM 干扰、重复 attach/dispose。
- 销毁：销毁后的 DOM 和网络回调均不能发布状态；共享连接不会被单个编辑器关闭。

一个现实的后续变化——把 WebSocket 换成共享 Worker 或 CRDT provider——只需替换 `CollaborationAdapter` 和连接控制器；document reducer、纯文本转换和 DOM binding 不应随之改写。这是该边界是否足够清晰的核心检验。