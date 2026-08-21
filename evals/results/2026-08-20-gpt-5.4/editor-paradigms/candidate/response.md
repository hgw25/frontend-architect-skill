结论：这个富文本编辑器模块最适合“函数式核心 + 命令式外壳”的混合设计，而不是把全部内容塞进纯 FP 或纯 OOP。

仓库里没有现成编辑器实现可检查，只有 `.frontend-architect` 指南；所以这里给的是架构决策，不假设现有代码细节。

| 部分 | 最合适的表示 | 原因 | 状态所有权 | 序列化 | 竞态/生命周期重点 |
| --- | --- | --- | --- | --- | --- |
| 文档内容转换、纯文本转换 | 纯函数 | 同输入应得同输出，易测、易复用 | 不持有状态 | 强，天然可序列化 | 无资源生命周期；注意不要偷偷读 DOM |
| selection 的文本级变换 | 纯函数 + plain data | 光标/范围调整本质是确定性状态变换 | 由 editor state 持有，不由 DOM 持有真相 | 强，可进历史、可协作同步 | DOM selection 只是投影，避免双写 |
| history（undo/redo） | Reducer | 关注事件驱动的可回放状态转移 | 由 editor session 或 store 持有 | 很强，适合快照/patch/event log | 必须定义合并策略、分支截断、远端操作是否进本地撤销栈 |
| 协作连接状态 | 状态机 + 外层连接适配器 | 有明确连接态、重连、同步中、冲突、失效等合法/非法迁移 | 连接管理器持有 transport/session 状态；文档真相仍在 editor state/CRDT 层 | 部分可序列化：协议状态可快照，socket/peer 句柄不可序列化 | 最大竞态源：重连、乱序 ack、重复消息、离线恢复 |
| DOM 订阅 | 闭包或小型类适配器 | 本质是资源订阅和 cleanup，不是领域状态 | 订阅器持有 listener、observer、dom refs | 弱，不应跨边界暴露 DOM 对象 | 必须显式 mount/unmount、解绑 observer/listener、防 stale ref |
| 销毁清理 | 类或 closure-returned disposer | 这是资源生命周期问题，不是纯计算 | session/controller 拥有所有 disposer | 不需要序列化 | 必须幂等；允许多次调用 destroy 而不出错 |
| 整体 editor session | 类，或闭包返回的 controller | 需要稳定 identity，统一持有订阅、连接、history、cleanup | 它是生命周期 owner，不一定是内容真相 owner | 自身不宜直接序列化；应导出 snapshot | 防止 framework 生命周期和 session 生命周期打架 |

更具体的判断：

1. `纯文本转换`
用纯函数。比如 `editorState -> plainText`、`htmlFragment -> text`、`selection + insert -> nextState`。这些逻辑不该依赖 DOM、网络或时间。

2. `history`
优先用 reducer，不要做成到处可变的类方法集合。因为 undo/redo 天然要求“事件导致什么状态变化”可见、可回放、可测试。若 history 需要事务合并，也是在 reducer action 层表达，如 `applyLocalStep`、`commitTransaction`、`undo`、`redo`。

3. `selection`
分两层：
一层是可序列化的领域 selection，比如 anchor/focus、path/offset，属于 editor state。
另一层是 DOM selection 映射，属于命令式外壳。
不要让 DOM selection 和内部 selection 同时做真相源，否则很快出现竞态和回写循环。

4. `DOM 订阅`
适合闭包或小类，不适合 reducer。因为它负责 `addEventListener`、`MutationObserver`、`SelectionChange` 这类外部资源同步。它应该把浏览器事件翻译成纯 action，再交给 reducer/state machine。

5. `协作连接`
拆成两块：
一块是连接状态机：`disconnected -> connecting -> syncing -> ready -> reconnecting -> failed`。
另一块是 transport adapter：WebSocket/WebRTC/SDK 包装，适合类或闭包。
不要把 socket 实例塞进可序列化 editor state；那会混淆“文档状态”和“资源状态”。

6. `销毁清理`
集中到 session/controller 的 `destroy()`，不要让每个子模块各自偷偷清理。`destroy()` 应负责：
取消 DOM 订阅、
关闭协作连接、
停止 timer/retry、
释放 observer、
阻止后续异步回调再提交状态。
这个销毁必须幂等。

**状态所有权**
建议分三层：
- `EditorState`：可序列化领域真相。内容、selection、history 指针、协作元数据中的纯数据部分。
- `Session/Controller`：不可序列化运行时 owner。持有订阅、连接、disposer、节流器、请求 token。
- `View/Framework component`：只持有 UI 层临时态，如 hover、IME 中间态、浮层开关；不要反向拥有核心文档状态。

**序列化边界**
应序列化：
- 文档树或操作日志
- selection 的领域表示
- history 的快照或可回放事件
- 协作所需版本号、clock、client id 这类 plain data

不应序列化：
- DOM 节点
- Range/Selection 对象
- Observer/listener
- WebSocket/peer/AbortController
- 定时器句柄

**竞态重点**
主要风险不是 reducer，而是边界层：
- DOM 事件晚到，覆盖了更新后的 selection
- 远端协作消息与本地 undo/redo 交错
- 重连后旧连接的消息继续回写
- destroy 后异步回调仍然 `dispatch`

控制方法：
- 给协作连接加 session token / generation id，旧回调直接丢弃
- 区分本地事务和远端事务，定义 history 是否吸收远端变更
- DOM 投影采用“内部状态推 DOM”，并防止回写环
- 所有副作用入口检查 `isDestroyed`

**生命周期边界**
最清晰的边界是：

- `pure functions`：无生命周期
- `reducer`：跟随 editor state 生命周期
- `state machine`：跟随连接/session 生命周期
- `DOM adapter`：跟随挂载节点生命周期
- `session/controller`：跟随整个编辑器实例生命周期

如果要落成一个可维护的模块，我会选这个形状：
- `editor-model/`：纯函数、类型、reducer
- `editor-history/`：history reducer 或事务逻辑
- `editor-collab/`：连接状态机 + transport adapter
- `editor-dom/`：DOM 订阅与 selection 映射
- `editor-session/`：类或闭包 controller，负责组装和 `destroy()`

最重要的设计取舍只有一句话：可序列化的文档状态与不可序列化的运行时资源必须分层，前者偏函数/Reducer，后者偏状态机/闭包/类。