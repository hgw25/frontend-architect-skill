我已在空仓库前提下补了一份设计文档，没有假设任何现有编辑器框架或实现：[EDITOR_ARCHITECTURE.md](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-editor-paradigms-baseline-qgr79qye/EDITOR_ARCHITECTURE.md)。

结论是混合范式最合适，不要把整个模块锁死为纯 FP 或纯 OOP：
- `selection`、`history` 适合放进 `Reducer`，因为它们要跟随事务演进且可回放。
- 文档变换、纯文本转换、selection 映射适合做成纯函数，便于测试、序列化和协作重放。
- DOM 订阅适合闭包或小型类，因为要持有 listener、observer、timer 这些不可序列化资源。
- 协作连接适合“状态机 + runtime 对象”，状态机管 `connecting/syncing/ready/reconnecting`，runtime 管 socket、心跳、重连和 ack。
- 销毁清理适合 `Disposable` 聚合器或 `EditorRuntime` 类，统一收口 `dispose()`，并保证幂等。

文档里已经把这几个关键问题展开了：
- 状态所有权：`EditorState` 只持有可序列化真相，DOM/socket/timer 留在 runtime。
- 序列化边界：能跨刷新恢复的进 core state，环境资源不进 state。
- 竞态边界：重点处理 DOM selection 抖动、本地 ops 与远端 ops 交错、旧连接晚到消息、销毁后异步回调。
- 生命周期边界：`mount/connect/dispose` 分开，`dispose()` 幂等，旧 epoch 消息直接丢弃。

如果你要，我下一步可以把这份设计继续收敛成一版 TypeScript 接口骨架，直接拆成 `core / runtime / collab / dom-bridge` 四个文件。