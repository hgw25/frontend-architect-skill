建议采用 `/work-orders` 作为工单列表路由、`/work-orders/new` 作为创建路由，保持 App Router 的路由入口轻量，交互状态只下沉到表单组件。

```text
app/
  layout.tsx                         # 现有全局框架，不承载工单状态
  work-orders/
    page.tsx                         # 工单列表 Server Component
    loading.tsx                      # 可选：列表加载反馈
    error.tsx                        # 可选：列表级错误与重试
    _components/
      work-order-list.tsx            # 列表复杂时再拆
    _lib/
      queries.ts                     # 仅在没有现成数据访问层时添加
    new/
      page.tsx                       # 创建页 Server Component
      create-work-order-form.tsx     # Client Component，表单交互边界
      actions.ts                     # Server Action：鉴权、校验、写入
    schema.ts                        # 创建、编辑确实共享规则时再提取
```

### 文件职责

- `work-orders/page.tsx`
  - 在服务端读取工单数据并组合页面。
  - 负责解析 `searchParams` 中的筛选、分页、排序。
  - 不复制服务端数据到客户端全局 Store。

- `work-orders/new/page.tsx`
  - 读取创建表单所需的服务端选项和权限。
  - 渲染标题、说明和表单。
  - 本身不需要 `"use client"`。

- `create-work-order-form.tsx`
  - `"use client"`，只拥有浏览器交互：字段草稿、联动、提交中状态、字段错误和焦点恢复。
  - 简单表单优先使用原生表单与 `FormData`；只有复杂联动、动态字段或项目已有表单方案时才引入表单库。
  - 不负责鉴权，也不把提交成功当成服务端事实的最终来源。

- `actions.ts`
  - 运行在服务端，负责重新验证外部输入、检查权限、调用现有业务/API 层并返回可序列化错误。
  - 成功后执行对应的缓存失效，并 `redirect` 到列表或新工单详情页。
  - 若项目已有 API client、service 或 mutation 层，应复用它，不在这里重复实现传输逻辑。

- `layout.tsx`
  - 继续只管理应用壳、导航和 Provider。
  - 只有工单区域确实存在共同侧栏、权限外壳或导航时，才新增 `work-orders/layout.tsx`；不要仅为了目录对称而创建。

### 状态归属

| 状态 | 所有者 |
|---|---|
| 工单列表、服务端选项、当前用户权限 | Server Component / 既有数据层 |
| 筛选、分页、排序 | URL `searchParams` |
| 尚未提交的字段值和字段联动 | `create-work-order-form.tsx` |
| 提交中、服务端字段错误、表单级错误 | 表单组件与 Server Action 的返回状态 |
| 已创建工单的权威数据 | 服务端数据源 |
| 成功后的列表刷新 | 创建操作负责失效相应缓存 |
| 防重复创建 | 服务端幂等键或业务唯一约束；禁用按钮仅是交互反馈 |

不建议为这一页新增全局 Store。以后增加“编辑工单”时，可以复用领域校验规则和表单字段组件，但创建、编辑各自保留提交动作与生命周期，避免做一个充满模式开关的通用表单。

当前工作区实际只有 `.frontend-architect` 和 Git 元数据，没有可检查的 Next.js 项目文件，因此以上是基于请求中明确的 App Router 契约给出的结构决策，未假称仓库已有数据层、表单库或测试约定；也没有修改任何文件。