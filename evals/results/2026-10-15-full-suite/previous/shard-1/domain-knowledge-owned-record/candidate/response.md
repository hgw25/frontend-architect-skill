已完成前端映射、导航决策和维护文档落盘：

- [catalog-language.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nbwo8zes/docs/catalog-language.md)：明确卖家资料、计费组织、登录用户三种身份。
- [012-directory.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nbwo8zes/docs/decisions/012-directory.md)：修订旧决策，详情导航改用 `supplierId`，同时保留历史原因。
- [catalog.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nbwo8zes/docs/catalog.md)：记录字段映射、导航规则、实施步骤和回归检查。
- [catalog.ts](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-nbwo8zes/api/catalog.ts)：保持原 `SupplierDto` 名称和字段不变。

最终约定：

- 页面“账户”改为“卖家资料”。
- 详情链接、路由参数和详情请求统一使用 `supplierId`。
- `organizationId` 仅表示计费组织。
- `userId` 仅表示登录用户，不从其他 ID 推断。
- 不增加作者用户入口，收藏继续保持本地操作。
- 验收数据要求 `supplierId` 与 `organizationId` 不同，以发现身份串用问题。

已逐文件复核内容。工作区没有可运行的前端工程或测试配置，因此未执行构建或运行时测试。