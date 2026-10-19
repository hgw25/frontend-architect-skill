已完成架构设计，未修改实现代码或 `.frontend-architect` 内容。

设计文档：[uploads-architecture.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-architecture-design-candidate-2t43d_gr/docs/uploads-architecture.md)

核心决策：

- 页面级 `UploadManager` 统一拥有队列、两个并发槽、`File`、取消控制器和资源释放。
- 单文件分片串行；暂停、继续和重试均通过 `inspect` 对账，避免重复上传已确认分片。
- `complete` 响应丢失时使用 `status` 确认，只有服务端返回 `fileId` 才发布成功。
- 使用纯状态转换配合有生命周期的 manager；React 只订阅快照和发送命令。
- 明确覆盖竞态、旧响应隔离、取消失败、页面关闭清理、进度语义和无障碍交互。
- 包含模块契约、状态转换表、技术架构图、数据流图、5 步实施顺序及验证矩阵。

工作区没有实际应用源码、包管理配置或测试环境，因此文档中的代码和浏览器检查均标记为拟议验证，未声称已经执行。文档格式及空白检查已通过。