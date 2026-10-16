已完成前端映射与导航方案，并写入现有项目说明位置：

- “账户”统一改称“卖家资料”。
- 资料详情导航和查询使用 `supplierId`。
- `organizationId` 仅表示计费组织，不作回退值。
- 登录用户、卖家资料、计费组织保持为三种独立身份。
- 接口名称、`SupplierDto` 及字段名保持不变。
- 不增加客户端身份映射或作者用户入口。
- 收藏仍为本地操作。

更新内容：

- [领域定义与字段映射](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-l1jgt5ra/docs/catalog-language.md)
- [修订后的导航决策](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-l1jgt5ra/docs/decisions/012-directory.md)
- [实现及验收说明](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-l1jgt5ra/docs/catalog.md)
- [DTO 字段语义注释](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-l1jgt5ra/api/catalog.ts)

本地 Skill 的指导使内容按“领域定义、决策记录、实施与验证”分开维护，并保留了旧决策的历史原因。已检查文件内容和尾随空白；工作区没有页面、路由实现或测试配置，因此无法进行运行时导航验证。`.frontend-architect` 未修改。