建议采用“纯转换内核 + 命令式资源外壳”的混合设计：Reducer 负责可重放的编辑事务，状态机负责协作连接，闭包封装单次 DOM 绑定，类负责稳定会话身份与资源生命周期。不要让 class、响应式 store 和协作 SDK 同时持有可写的文档真相。

工作区中没有现有应用代码或技术栈文件，因此本次给出模块契约与实现边界，没有修改文件或声称完成运行验证。

## 范式选择

| 部分 | 选择 | 关键理由 |
|---|---|---|
| 文档变换、selection 映射 | 纯函数 | 相同文档和事务产生相同结果，可独立测试 |
| 纯文本转换 | 纯函数 | 是确定性的有损投影，不需要身份或资源 |
| selection、history、文档投影 | Reducer | 必须原子更新，并支持回放、撤销和调试 |
| 协作连接阶段 | 状态机 | 重连、同步、关闭存在合法/非法转换和异步竞态 |
| DOM 订阅 | 闭包适配器 | 生命周期局限于一次 root 绑定，只需返回 disposer |
| 协作传输 | 类 | WebSocket/SDK、计时器、重试和连接代次具有稳定身份 |
| 整体编辑会话 | 薄 `EditorSession` 类 | 组合状态与资源，提供统一销毁；不承载所有领域逻辑 |

## 建议结构

```text
editor/
  index.ts                    # 唯一公共入口
  model/
    types.ts                  # Doc、Selection、Transaction、Snapshot
    transforms.ts             # 纯文档/selection 变换
    reducer.ts                # 编辑事务与 history
    serialization.ts          # 版本化文档格式
    toPlainText.ts            # 纯文本投影
  runtime/
    EditorSession.ts          # 组合、dispatch、订阅、销毁
    bindEditorDom.ts          # DOM ↔ 模型 selection/input
  collaboration/
    connectionMachine.ts      # 纯状态转换
    CollaborationController.ts# 网络、重连、SDK 适配
    protocol.ts               # opId、版本和消息验证
```

依赖方向保持为：

```text
UI/framework → EditorSession → model
                         └──→ DOM adapter
                         └──→ collaboration adapter
```

`model` 不依赖 DOM、框架、网络或计时器。

## 状态所有权

核心状态建议是普通数据：

```ts
type EditorState = {
  document: DocumentSnapshot
  selection: ModelSelection | null
  history: {
    undo: HistoryEntry[]
    redo: HistoryEntry[]
  }
  revision: number
  composition: 'idle' | 'composing'
}
```

所有权规则：

- `EditorSession` 私有持有唯一 `EditorState`，每次只通过 reducer 替换。
- UI/store 只订阅只读 snapshot，不保存第二份可写副本。
- selection 使用节点 ID、模型 offset 和方向表示，不能保存 `Range`、`Node` 等 DOM 对象。
- 文档变化和 selection 重映射必须属于同一次事务，避免 selection 指向已删除节点。
- history 保存本地事务及其 inverse、分组信息和基准版本，不建议保存整份 DOM 或全量文档副本。
- 协作引擎若内部持有 CRDT 文档，它是规范副本；Reducer 中的 `DocumentSnapshot`只是对应 revision 的不可变投影，不能成为另一份独立可写真相。

Reducer 可以接收这些事件：

```ts
type EditorAction =
  | { type: 'localTransaction'; transaction: Transaction; groupId?: string }
  | { type: 'remoteTransaction'; transaction: Transaction; serverVersion: number }
  | { type: 'selectionObserved'; selection: ModelSelection; revision: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'compositionStarted' }
  | { type: 'compositionEnded'; transaction: Transaction }
```

Reducer 不直接发送网络消息。纯 transition 可以返回 `{ state, effects }`，由 `EditorSession` 执行诸如 `sendOperation`、`renderSelection` 的 effect。

history 只记录本地可撤销意图；远端事务不进入本地 undo 栈，但必须通过协作引擎重映射已有 inverse 和 selection。合并连续输入所需的时间或 `groupId` 应由事件传入，Reducer 内不要读取 `Date.now()`。

## DOM 边界

`bindEditorDom(root, dispatch)` 适合闭包：

```ts
const dispose = bindEditorDom(root, dispatch)
```

它负责：

- 注册 `beforeinput`、`selectionchange`、`compositionstart/end` 等监听；
- 将 DOM selection 立即转换为模型 selection；
- 用绑定时的 `root` 和渲染 revision 过滤无关或过期事件；
- 返回幂等 disposer，只释放这一次绑定。

DOM selection 是模型 selection 的镜像，不是权威状态。渲染后再由模型 selection 恢复 DOM selection。受控渲染产生的 DOM 变化不能被误判为用户输入。

## 协作状态机与竞态

连接状态建议显式表达：

```text
idle → connecting → syncing → online
          ↓            ↓        ↓
       backoff ← reconnecting ← disconnected
          └────────────────────→ fatal
任意活动状态 ──────────────────→ closed
```

`CollaborationController` 拥有 socket/SDK、重连计时器、AbortController、待发送队列和 `connectionGeneration`。状态机只决定转换；类执行连接、关闭和计时器等副作用。

必须确定这些策略：

- 每个本地操作携带稳定 `opId`、`clientSeq` 和基准版本；编辑写入是有序队列，不能使用 latest-wins。
- 超时代表结果未知。只有协议支持幂等 `opId` 时才能重发，否则先与服务端版本对账。
- 重连后的旧 socket 回调携带旧 generation，不能发布状态、错误或清除新连接的 loading 状态。
- 服务端版本或 CRDT/OT 算法处理乱序和冲突；不要仅凭客户端到达顺序覆盖文档。
- IME composition 期间暂缓会破坏组合文本的 DOM 发布；远端事务由协作引擎保留并在 composition 结束时重映射/合并。
- `selectionObserved` 带观察时的 revision。若 DOM 事件对应旧渲染，丢弃并在当前文档上重新读取，而不是写入过期 offset。

协作算法本身应复用成熟 CRDT/OT 方案；自研模块只负责适配协议、事务和生命周期。

## 序列化边界

只持久化稳定领域数据：

```ts
type SerializedDocument = {
  schemaVersion: number
  content: SerializedNode
}
```

具体规则：

- 文档使用版本化 JSON 和明确迁移，不以 `innerHTML` 作为规范格式。
- HTML 导入属于不可信边界，需解析、白名单化并转换成内部节点。
- `toPlainText(document, options)` 是纯函数；列表标记、换行、表格和不可见节点的降级规则必须由 `options` 或模块契约明确。
- selection 通常是瞬态状态。若需要草稿恢复，只保存模型位置、方向和文档 revision，并提供节点失效后的就近回退。
- history 默认不持久化；跨版本、协作重放和 schema 迁移很容易使 inverse 失效。
- socket、DOM 节点、监听器、AbortController、计时器和连接状态都不可序列化。
- 离线待发送操作若是产品要求，应作为独立、版本化 outbox 持久化，并由协作协议负责去重，不能混入普通编辑 snapshot。

## 生命周期与销毁

`EditorSession` 的公共面保持较窄：

```ts
interface EditorSession {
  getSnapshot(): Readonly<EditorState>
  dispatch(command: EditorCommand): void
  subscribe(listener: () => void): () => void
  attachDom(root: HTMLElement): () => void
  destroy(): void
}
```

`destroy()` 应幂等，并按以下顺序处理：

1. 标记 session disposed 并递增 generation，立即阻止旧回调发布。
2. 移除 DOM 监听、observer 和框架订阅。
3. 取消重连计时器、请求及尚未发布的异步任务。
4. 释放协作连接租约。
5. 清空外部 listener 引用。

若连接由多个编辑器共享，销毁只能 `release/unsubscribe` 当前租约，不能直接关闭共享连接。

同步 `destroy()` 不应暗示“网络内容已经保存”。如产品要求离开前尽力提交，应另设 `await session.close({ flush: true })`，明确超时和未知结果；框架 unmount 仍调用快速、幂等的 `destroy()`。

至少应验证以下真实顺序：旧连接在新连接成功后报错、远端删除当前 selection、远端编辑发生在本地 undo 前、IME 期间收到远端事务，以及 destroy 后旧 ack/计时器回调到达。