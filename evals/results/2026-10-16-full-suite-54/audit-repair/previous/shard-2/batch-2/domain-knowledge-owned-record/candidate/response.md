已完成项目说明更新，方案明确为：

- 目录“账户”统一更名为“卖家资料”。
- 详情导航传递 `SupplierDto.supplierId`，不再使用 `organizationId`。
- 保持现有接口、DTO 和字段名称不变。
- 明确卖家资料、计费组织、登录用户是三种独立身份。
- 不推导 `userId`，不增加作者用户入口。
- 收藏继续作为本地操作。

更新文件：

- [docs/catalog-language.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-q740pb45/docs/catalog-language.md)
- [docs/decisions/012-directory.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-q740pb45/docs/decisions/012-directory.md)
- [docs/catalog.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-q740pb45/docs/catalog.md)

原 012 决策在原位置修订，并保留了旧的一一对应前提及被取代原因。目录说明中还记录了字段映射、导航调用方式、后续变化边界和可执行验收条件。

已通过 `git diff --check`，并检查关键身份术语的使用。工作区没有页面源码或测试框架，因此未进行运行时导航验证，也未虚构具体 URL 或路由名称。