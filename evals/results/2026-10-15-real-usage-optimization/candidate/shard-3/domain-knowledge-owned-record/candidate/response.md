已完成前端映射与导航方案，并将维护信息写入现有文档位置：

- [catalog-language.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-gd_v979w/docs/catalog-language.md)：明确卖家资料、计费组织、登录用户三种身份及字段映射。
- [012-directory.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-gd_v979w/docs/decisions/012-directory.md)：修订旧决策，资料详情统一使用 `supplierId`，禁止回退到 `organizationId`。
- [catalog.md](/var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-gd_v979w/docs/catalog.md)：记录前端映射示例、导航链、实施步骤和可复现验收条件。

方案同时约束：

- 界面“账户”改为“卖家资料”。
- 接口及 DTO 字段名称保持不变。
- 收藏继续作为本地操作。
- 不推断用户身份，不增加作者用户入口。
- 未来计费组织入口必须独立使用 `organizationId`。

已完成语义检索和空白格式检查；`.frontend-architect` 未修改。由于工作区没有实际页面、路由或测试代码，本次按要求仅交付可直接指导后续实现的项目说明。