已完成架构设计，设计文档位于 [docs/uploads-architecture.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-architecture-design-candidate-cydvg5vq/docs/uploads-architecture.md)。

核心决策：

- 页面级 `UploadManager` 统一拥有文件资源、FIFO 队列、两个并发槽和清理生命周期。
- 纯 reducer 管理每个文件的合法状态，React hook 仅负责订阅和卸载。
- 每个文件串行上传分片；暂停、继续和重试通过 `inspect` 对账，避免重复传输已确认分片。
- 进度只计算服务端确认的字节，不伪造发送进度。
- `complete` 结果未知时通过 `status` 对账，只有获得服务端 `fileId` 才报告成功。
- 保留现有 `uploadFile` 作为迁移兼容入口，确认真实调用者迁移后再删除。
- 明确记录了 `create` 响应丢失无法找回 `uploadId` 的契约限制，需要服务端过期清理孤儿会话。

文档还包含两张 Mermaid 架构/数据流图、状态与公开类型契约、恢复矩阵、5 个依赖有序的实施增量及竞态测试清单。

已完成 Markdown 空白检查；仓库没有业务源码、依赖清单或 Mermaid 渲染器，因此未执行运行时测试和图表渲染验证。`.frontend-architect` 内容未修改。