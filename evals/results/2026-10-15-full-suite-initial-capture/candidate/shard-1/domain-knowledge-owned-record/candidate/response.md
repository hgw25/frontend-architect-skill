已完成前端映射、导航决策和维护文档：

- [领域说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-0p9wj8ft/docs/catalog-language.md)：明确卖家资料、计费组织、登录用户是三种独立身份。
- [目录决策](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-0p9wj8ft/docs/decisions/012-directory.md)：原位修订旧决定，资料详情由 `organizationId` 改用 `supplierId`。
- [目录实施说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-0p9wj8ft/docs/catalog.md)：记录字段映射、导航链路、实施范围及验收条件。
- [接口契约](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-0p9wj8ft/api/catalog.ts)：保持 `SupplierDto` 及其字段不变。

最终方案：

- “账户”改为“卖家资料”，显示 `displayName`。
- 资料身份、详情路由参数和详情查询统一使用 `supplierId`。
- `organizationId` 仅表示计费组织，不作为回退标识。
- 不在客户端推导用户身份，不新增作者用户入口。
- 收藏继续沿用现有本地行为。
- 不改既有接口名称，不引入新技术栈或通用身份框架。

已检查全部落盘内容和空白格式。仓库中没有可运行的前端工程或测试配置，因此未执行 UI/自动化测试；文档已包含后续实现所需的三项验收场景。