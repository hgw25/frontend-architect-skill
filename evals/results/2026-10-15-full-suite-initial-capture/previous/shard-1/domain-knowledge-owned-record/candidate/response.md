已完成前端映射与导航方案，并写入现有文档位置。

核心决策：

- `supplierId`：卖家资料身份、目录行稳定标识及详情导航参数。
- `organizationId`：仅表示计费组织，不再用于资料详情。
- `userId`：仅来自登录会话，不从前两种身份推断。
- 保留现有接口名称、`SupplierDto` 字段、路由名称与 URL 形状。
- 不增加作者用户入口；收藏继续作为本地操作。

更新内容：

- [catalog-language.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nottqe13/docs/catalog-language.md)：重写三种身份及服务端边界。
- [012-directory.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nottqe13/docs/decisions/012-directory.md)：修订旧的 `organizationId` 导航决策并保留历史理由。
- [catalog.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nottqe13/docs/catalog.md)：记录字段映射、导航契约、实施边界及使用三个不同 ID 的回归场景。
- [catalog.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nottqe13/api/catalog.ts)：按提供内容保留接口类型不变。

已检查身份术语覆盖和文档格式。当前仓库没有实际前端工程、路由实现或测试配置，因此未运行构建与自动化测试；该限制及后续定位、验收步骤已写入项目说明。