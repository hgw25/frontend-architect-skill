建议采用“路由负责组合、表单负责交互、服务端负责可信写入”的最小结构。无需为两个页面先建立完整 `features/` 分层。

```text
app/
  layout.tsx
  page.tsx
  work-orders/
    page.tsx
    new/
      page.tsx
      work-order-form.tsx
      actions.ts
```

文件归属：

- `app/work-orders/page.tsx`
  - 工单列表或工单入口页。
  - 保持为 Server Component，读取工单数据并组合页面。
  - 筛选、分页等需要刷新、分享或前进后退恢复的状态放入 `searchParams`，不要复制到全局 store。
- `app/work-orders/new/page.tsx`
  - 创建页面的服务端入口。
  - 负责权限检查、初始选项加载和页面组合，不持有表单草稿。
- `app/work-orders/new/work-order-form.tsx`
  - 拥有字段草稿、字段交互、客户端提示和提交反馈。
  - 只有确实需要动态字段、即时校验或提交状态时才加 `'use client'`；简单表单可以继续保持服务端表单。
- `app/work-orders/new/actions.ts`
  - 服务端创建命令：重新鉴权、权威校验、写入、缓存失效以及成功后的跳转。
  - 不信任客户端权限检查或客户端校验。
- `app/layout.tsx`
  - 只保留全局导航、Provider 和页面外壳。
  - 暂不增加 `app/work-orders/layout.tsx`；只有列表与创建页确实共享工单导航或稳定外壳时再添加。

状态归属：

| 状态 | 所有者 |
|---|---|
| 已保存的工单 | 服务端数据源 |
| 工单列表结果 | `work-orders/page.tsx` 的服务端读取边界 |
| 筛选、分页、排序 | URL `searchParams` |
| 创建表单草稿、touched/dirty | `work-order-form.tsx` |
| 派生展示值 | 渲染时计算，不单独存 state |
| submitting、字段错误、表单级错误 | 表单及其服务端 action 返回状态 |
| 当前用户和创建权限 | 服务端会话/授权层 |
| 创建成功后的列表更新 | 服务端使列表缓存失效并跳转，不维护第二份客户端列表 |

若校验规则同时被客户端提示和服务端写入使用，可增加 `app/work-orders/new/schema.ts`；否则先留在服务端 action 附近。未来增加“编辑工单”时，再把可复用字段和纯校验提升到 `app/work-orders/_components/` 或独立的工单 feature，创建与编辑命令仍保持分开。

工作区当前 Git 文件树为空，仅存在未纳入提交的 `.frontend-architect` 指引目录，因此无法核实项目已有的数据访问、表单库、测试或命名约定；以上是基于题述 App Router 结构的具体建议。本次未修改任何文件。