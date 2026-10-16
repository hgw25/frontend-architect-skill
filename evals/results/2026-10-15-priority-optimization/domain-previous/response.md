已将方案和可直接采用的项目说明写入原有三个文档位置。当前规则是：目录展示“卖家资料”，资料详情从导航到查询统一使用 `supplierId`；接口名称和 `SupplierDto` 保持不变。

| 身份 | 前端来源与用途 |
| --- | --- |
| 卖家资料 | `SupplierDto.supplierId` 标识资料，`displayName` 用于显示，详情导航传 `{ supplierId: row.supplierId }` |
| 计费组织 | `SupplierDto.organizationId` 保持计费组织语义，不作为资料详情 ID |
| 登录用户 | 来自登录会话的 `userId`，不能由目录 DTO 推导 |

复用现有目录映射、路由和详情请求方式，在原调用链里落实这一契约，不增加技术栈、通用身份框架或新的接口名称。行上的“账户详情”改为“卖家资料详情”。服务端没有用户身份映射，因此不增加作者用户入口或映射补查。收藏保留现有本地流程和独立交互。

写入的项目说明：

- [docs/catalog-language.md](docs/catalog-language.md)：改正现行领域含义，列明三种身份和各自来源，说明接口命名与领域展示命名的关系。
- [docs/decisions/012-directory.md](docs/decisions/012-directory.md)：记录已接受的 `supplierId` 决策，明确取代原 `organizationId` 决策，保留旧的一一对应假设作为历史理由，并写明旧链接、收藏键的迁移约束。
- [docs/catalog.md](docs/catalog.md)：给出字段映射、导航到详情查询的完整路径、收藏保持方式、实施检查与验收样例。

旧链接不能把 `organizationId` 直接改名为 `supplierId`；旧收藏键也不能在未核实格式和映射时直接转换。已在原决策文件标出这些实施前需要从实际代码确认的事项，主方案无需等待用户身份映射。后续增加计费组织入口时，其 `organizationId` 契约可以独立扩展，资料详情继续使用 `supplierId`。

实际读取：本工作区 `.frontend-architect/SKILL.md` 全文、`request.txt`，以及唯一参考文件 `.frontend-architect/references/architecture-and-code.md`。未读取其他 reference。

实际执行：用 `cat` 阅读上述材料，`rg --files` 核实工作区只有请求材料；通过 `apply_patch` 创建三个文档和本回答；检查三个项目文档中的相对 Markdown 链接均指向存在的文件，并核对各文档的身份与导航表述。

验证范围：完成文档一致性和链接检查。没有应用源码、路由实现、详情请求函数或收藏存储，未运行应用测试，也未验证真实导航、请求或兼容迁移。文档给出了可执行的验收条件：让 `supplierId` 与 `organizationId` 不同，检查点击导航和直接访问详情均以同一个 `supplierId` 查询，同时确认收藏仍是本地操作、没有作者用户入口。未提交、发布或部署。
