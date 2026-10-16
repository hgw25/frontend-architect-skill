# 目录领域

## 当前定义

| 概念 | 含义 | 标识 | 目录中的用途 |
| --- | --- | --- | --- |
| 卖家资料 | 目录行展示、供查看详情的卖家资料 | `supplierId` | 行身份及卖家资料详情导航 |
| 计费组织 | 与该资料关联的计费主体 | `organizationId` | 保留组织关联，不用于卖家资料详情导航 |
| 登录用户 | 当前操作人 | `userId` | 登录会话中的用户身份 |

这三种身份不可互换。卖家资料与计费组织不再以一一对应为前端前提；一个资料的 `organizationId` 不能代替其 `supplierId`。服务端目前不提供资料与用户的身份映射，不能从 `supplierId` 或 `organizationId` 推导作者用户的 `userId`，也不增加作者用户入口。

`SupplierDto` 的接口名称和字段保持不变：`supplierId` 是卖家资料标识，`organizationId` 是计费组织标识，`displayName` 是目录行显示名称。前端不把这些字段统一别名为含义不明的 `id` 或 `accountId`。

## 旧称与变更

目录中的“账户”改为“卖家资料”，包括列标题、详情链接文案及对应无障碍名称。旧文档曾将“账户”定义为目录行展示的计费组织，并以 `organizationId` 打开详情；该定义已被批准的本次变更替代，不能继续作为新调用方的依据。

导航决定及原决定背景见 [012-directory.md](decisions/012-directory.md)；前端映射和实施验收见 [catalog.md](catalog.md)。
