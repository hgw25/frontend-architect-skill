架构设计已完成并保存至 [docs/uploads-architecture.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-architecture-design-candidate-ms7au1vu/docs/uploads-architecture.md)。

核心决策：

- 页面级 FIFO 队列，最多两个文件工作流并发。
- 单文件顺序分片，进度只统计服务端已确认分片。
- 暂停、重试先通过 `inspect` 对账，避免重复传输。
- `complete` 响应丢失后使用 `status` 确认最终结果。
- 用运行代次和独立 `AbortController` 隔离迟到回调与暂停/取消竞态。
- 继续复用 `appApi`，不新建认证或请求框架。
- 页面卸载中止本地工作并释放 `File` 引用，不承诺不可靠的卸载期服务端请求。
- 保留现有 `uploadFile` 入口，待真实仓库中确认调用方迁移后再决定删除。

文档包含类型及模块契约、两张文本图、5 步实施顺序、验证矩阵和后续片级并发变化检查。由于工作区没有实际应用源码，本次严格停留在架构设计，没有虚构实现或执行应用测试；已完成文档格式检查。

本次使用了项目本地 `frontend-architect` Skill，其要求决定了先形成可执行技术设计、明确所有权与异步生命周期，并将计划验证和已执行证据分开记录。