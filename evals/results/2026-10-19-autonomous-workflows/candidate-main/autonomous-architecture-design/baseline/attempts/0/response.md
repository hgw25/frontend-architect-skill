已完成文件上传模块架构设计，交付见 [docs/uploads-architecture.md](/private/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-autonomous-architecture-design-baseline-zpgpwkoc/docs/uploads-architecture.md)。

核心决策：

- 页面级 `UploadManager` 统一管理任务、FIFO 队列及最多两个活动文件。
- 单文件分片串行上传，暂停、失败重试时通过 `inspect` 对账，避免重复传输已确认分片。
- 进度仅统计服务端确认字节，不伪造请求内进度。
- `complete` 响应丢失时用 `status` 对账，未取得 `fileId` 不报告成功。
- 使用 generation 防止取消、暂停后的旧请求回写状态。
- React 通过 Provider、`useSyncExternalStore` 和只读快照接入。
- 页面卸载时中止请求、释放 `File` 等本地引用，并尽力终止服务端会话。
- 所有请求仍委托现有 `appApi`，没有新增认证或请求框架。
- 明确记录了 `create` 响应丢失无法恢复 `uploadId` 的后端契约限制。

仓库当前 `HEAD` 为空树，没有 artifact 中所述源码或可运行测试，因此本次没有添加可能无法编译的实现占位代码。已通过 `git diff --check`。