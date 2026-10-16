已完成前端映射与导航方案，并写入原有文档位置：

- [catalog-language.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-ca8dqrff/docs/catalog-language.md)：明确卖家资料、计费组织、登录用户是三种独立身份。
- [012-directory.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-ca8dqrff/docs/decisions/012-directory.md)：修订原决策，详情导航由 `organizationId` 改为 `supplierId`，保留历史原因。
- [catalog.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-ca8dqrff/docs/catalog.md)：记录字段映射、导航规则、作者入口限制及可执行验收步骤。
- [catalog.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-ca8dqrff/api/catalog.ts)：保持 `SupplierDto` 名称和字段不变。

核心决策是：目录显示“卖家资料”，详情路由和查询统一传递同一行的 `supplierId`；`organizationId` 只属于计费组织；不推断 `userId`、不增加作者用户入口，收藏仍为本地操作。

按本地 Frontend Architect 指引，领域定义、持久决策和实施验收分别落在各自已有文档中。工作区没有应用实现、路由文件或测试配置，因此未虚构 URL，也没有可运行的 UI 测试；已通过全文检索核对旧含义仅保留在历史背景和迁移说明中。