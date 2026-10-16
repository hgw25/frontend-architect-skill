建议把工单列表与创建流程放在同一个路由段内，创建表单使用独立 `/work-orders/new` 路由。这样 URL 可直接访问，创建流程也不会把列表页变成同时管理查询和草稿状态的“大页面”。

```text
app/
  layout.tsx                         # 全站壳层，保持现有职责
  work-orders/
    page.tsx                         # 工单列表页，Server Component
    new/
      page.tsx                       # 创建页，Server Component
    _components/
      work-order-form.tsx            # 表单交互，Client Component
    actions.ts                       # 创建工单的 Server Action
    work-order-input.ts              # 输入类型、纯校验规则（确有共享时再拆）
```

文件归属：

- `app/work-orders/page.tsx`
  - 获取并呈现工单列表。
  - 保持为 Server Component，不因为局部表单交互给整页添加 `"use client"`。
  - 筛选、分页等可分享/可刷新状态放在 `searchParams`，不复制进全局 store。

- `app/work-orders/new/page.tsx`
  - 负责创建页的路由级编排，例如权限检查、页面标题、加载表单所需的服务端选项。
  - 不持有字段草稿，也不直接实现每个输入控件。

- `work-order-form.tsx`
  - 添加 `"use client"`。
  - 持有尚未提交的字段值、客户端即时校验提示、控件展开状态等短生命周期 UI 状态。
  - 持有本次提交的 `pending` 状态以及服务端返回的字段错误。
  - 不持有工单列表或已落库工单的长期副本。

- `actions.ts`
  - 作为服务端信任边界，负责重新校验输入、鉴权、调用项目已有的数据访问能力、处理可预期错误。
  - 成功后刷新工单列表对应缓存并跳转到列表页或详情页。
  - 数据库客户端、密钥和授权逻辑不得进入 Client Component。
  - 如果项目已有 API/command/service 模式，应复用它，而不是并行创建第二套数据层。

- `work-order-input.ts`
  - 只有在服务端校验和客户端提示确实共享字段定义时才创建。
  - 放纯类型和可跨运行时使用的校验规则；数据库操作、环境变量等服务端依赖仍留在服务端模块。
  - 不必预先建设 `types/`、`services/`、`hooks/` 等空目录。

状态归属应遵循：

| 状态 | 所有者 |
|---|---|
| 已保存的工单、权限、最终校验结果 | 服务端/后端数据源 |
| 列表筛选、分页、排序 | URL `searchParams` |
| 未提交的表单草稿 | `WorkOrderForm` |
| 提交中、提交失败、字段错误 | 创建表单及对应 Server Action |
| 创建成功后的列表新鲜度 | 创建操作负责失效或刷新缓存 |
| 导航栏、全局 Provider | 现有 `app/layout.tsx` |

暂不建议增加 `app/work-orders/layout.tsx`。只有列表、创建页以及未来详情页确实共享工单区域导航、权限边界或稳定壳层时再添加；仅包一层容器没有独立价值。

当前工作区实际没有 `app/`、`package.json` 或其他应用文件，Git 树也是空的，因此以上是基于用户给出的 App Router 前提提出的结构决策，无法确认项目现有的数据访问、表单库和命名约定。此次没有修改任何文件，`.frontend-architect` 保持不变。