已给出前端映射与导航方案，并在原有文档位置写入可继续维护的内容。

| 数据 | 用途 |
| --- | --- |
| `displayName` | 卖家资料名称 |
| `supplierId` | 卖家资料行身份、详情路由参数及详情请求标识 |
| `organizationId` | 计费组织关联，不能用于资料详情 |
| 会话 `userId` | 当前操作人，不能由资料或组织 ID 推导 |

目录“账户”改为“卖家资料”；链接生成、详情参数读取和请求统一使用该行 `supplierId`。`SupplierDto`、外部字段及现有详情接口名称保持不变。复用项目现有路由和数据访问机制，不新建身份映射层。服务端没有用户身份映射，不增加作者用户入口；收藏沿用现有本地操作和持久化语义。

已更新的说明内容：

- `docs/catalog-language.md`：三种身份的当前定义、字段语义及旧“账户”含义的废止。
- `docs/decisions/012-directory.md`：记录本次批准的导航修订、理由及后果，同时保留原一一对应假设和旧决定背景。
- `docs/catalog.md`：字段映射、导航接入步骤和验收条件，尤其用不同资料 ID／组织 ID 和同组织的两份资料发现误用标识。

输入只提供上述文件的文字材料，没有真实页面或接口实现，因此本次交付为方案和文档，未实现完整项目。具体路由路径、详情函数签名和旧链接兼容能力不做猜测；旧 `organizationId` 不能直接重命名为 `supplierId` 后使用。

实际读取：完整 `.frontend-architect/SKILL.md`、`request.txt`，以及唯一参考 `.frontend-architect/references/architecture-and-code.md`。未读取其他 references、全局 skill、原项目或其他工作区。

实际执行：枚举本工作区输入文件；在已有文档位置生成三份说明；检查 Markdown 相对链接可解析，并检查当前定义、导航决定与实施方案均明确使用 `supplierId`，旧 `organizationId` 决定只保留为历史背景。没有页面运行环境，未执行类型检查、浏览器交互或真实接口测试；接入后的验收步骤已写入 `docs/catalog.md`。未提交或发布。
