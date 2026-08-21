已在仓库里补了一份可落地的模块设计说明：[EDITOR_MODULE_ARCHITECTURE.md](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-editor-paradigms-baseline-qj59bv61/EDITOR_MODULE_ARCHITECTURE.md:1)。

结论是分层组合，而不是把整个编辑器强行做成纯 FP 或纯 OOP：
`selection`、`history`、`纯文本转换` 适合放在可序列化的 core state 里，用纯函数和 Reducer 保证可回放、可测试；`DOM 订阅` 适合用闭包加小型状态机处理 `selectionchange`、IME 和事件乱序；`协作连接` 适合用“类 + 显式状态机”承载 socket、重连、ack、未确认队列；`销毁清理` 则统一成 `dispose()` 协议，由顶层 runtime 收口。

文档里也明确写了状态所有权、哪些状态该序列化、并发下的 rebase/版本边界，以及 `mount/unmount/dispose` 的生命周期界线。当前仓库原本是空的，只有这份新增设计文档，未运行测试。