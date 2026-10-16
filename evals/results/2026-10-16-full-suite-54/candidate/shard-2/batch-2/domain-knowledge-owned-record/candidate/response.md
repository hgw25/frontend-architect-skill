已完成方案与维护文档落地：

- 前端以 `supplierId` 作为卖家资料身份及详情导航参数。
- `organizationId` 仅代表计费组织，`userId` 仅代表登录用户，三者不可互换。
- 页面“账户”改为“卖家资料”，接口名称和 DTO 字段保持不变。
- 不增加作者用户入口，收藏继续保持本地操作。
- [领域说明](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-yekzpknl/docs/catalog-language.md:1>) 已更新三种身份的定义。
- [目录实施说明](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-yekzpknl/docs/catalog.md:1>) 已记录字段映射、导航方案和四项验收条件。
- [012 旧决策](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-yekzpknl/docs/decisions/012-directory.md:1>) 保留历史理由并标记为已取代。
- 新增 [013 当前决策](</var/folders/_6/gpmy4q4166xbmb7153p4cqp80000gn/T/frontend-architect-domain-knowledge-owned-record-candidate-yekzpknl/docs/decisions/013-directory-seller-profile.md:1>)。

按 Skill 指导，将领域定义、替代决策和实施验收分别归档，避免抹除旧决策背景。

已检查文档内容、交叉链接和身份约束。工作区原先没有页面源码、测试或 `api/catalog.ts`，因此本次无法实际修改或运行验证前端导航。