已完成文件上传模块的架构设计，保存于 [docs/uploads-architecture.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-architecture-design-candidate-8symz9g8/docs/uploads-architecture.md)。

核心决策：

- 全局两个文件级调度槽，每个文件串行上传分片。
- 使用 reducer 表达状态转换，页面期 hook 管理调度、Promise 和 `AbortController`。
- 暂停/重试通过 `inspect` 对账，避免重复上传已确认分片。
- `complete` 异常后通过 `status` 确认最终结果，绝不提前报告成功。
- 进度采用服务端确认字节数；现有契约只能提供分片级阶梯进度。
- 继续复用 `appApi`，仅增加薄适配层，不创建新的请求或认证框架。
- 保留现有 `uploadFile` 兼容入口，待真实消费者迁移后再决定删除。

文档包含模块职责、类型和函数契约、竞态处理、技术架构图、数据流图、5 个依赖有序的实施步骤、验收矩阵及后续扩展检查。

当前工作区没有题面提及的应用源码，因此未实施代码或执行应用测试；文档已明确区分提供事实、拟议路径和实施前待核实事项。格式检查未发现空白错误，`.frontend-architect` 内容保持未修改。