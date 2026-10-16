当前工作区实际没有 Next.js 项目文件：Git 提交也是空树，只有未纳入 Git 的 `.frontend-architect` 指引。因此无法确认项目现有命名、数据访问方式或表单方案。下面是基于 App Router 的建议归属，不冒充仓库现状。

假设“工单”采用 `work-orders` 作为 URL：

```text
app/
  layout.tsx                         # 现有全局外壳、导航、Provider
  work-orders/
    page.tsx                         # 工单列表/入口，Server Component
    new/
      page.tsx                       # 创建页，负责服务端数据准备与页面组装
      WorkOrderCreateForm.tsx        # 交互表单，Client Component
      actions.ts                     # 创建工单的 Server Action
      work-order-input.ts            # 输入类型及可复用的纯校验规则（确有内容再拆）
```

具体决策：

- `app/work-orders/page.tsx`：读取并展示服务端权威的工单数据；筛选、分页如果需要刷新、分享或前进后退，应放入 URL `searchParams`，不要复制到全局 Store。
- `app/work-orders/new/page.tsx`：保持为 Server Component，加载客户、负责人、工单类型等初始选项，并组合表单。不要因为表单需要交互就把整个页面标成 `'use client'`。
- `WorkOrderCreateForm.tsx`：拥有最小范围内的客户端状态，例如草稿字段、已触碰字段和纯客户端反馈。派生值直接计算，不再建立一份状态。
- `actions.ts`：拥有鉴权、服务端权威校验、数据写入、错误映射、成功后的缓存失效与跳转。客户端校验只改善体验，不能代替这里的校验和授权。
- 提交状态只保留一个来源：由 Server Action 的 action state/pending 状态表达 `idle → submitting → error/success`，不要再并行维护 `isLoading`、`submitError` 等可能互相矛盾的状态。
- `app/layout.tsx` 不应拥有表单草稿或提交状态。只有当所有工单子页面确实共享独立导航或外壳时，才新增 `app/work-orders/layout.tsx`。
- 不先建全局 `store/`、`services/`、`hooks/` 或完整 `features/work-orders/` 层级。以后若工单能力跨多个路由复用，再把领域规则和数据边界提升为独立 feature；路由文件仍只负责入口与组装。
- 如果项目已有表单库、校验 schema、Server Action 封装或 API client，应沿用它们，而不是采用上述新文件名重复建设。

一个现实的后续变化是“编辑工单”：届时创建和编辑可共享纯输入规则及表单字段组件，但各自保留提交动作和服务端权限规则。这样无需把当前表单状态提前提升到全局。

本次没有修改文件；由于项目源文件缺失，也无法针对真实目录、Next.js 版本或既有检查命令做验证。