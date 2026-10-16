当前工作区没有 `App.tsx`、`package.json` 或其他应用源码，Git 树也是空的；因此无法核对现有字段名、存储键和测试工具。下面是基于题述职责的目标结构，文件名属于明确建议，不代表仓库现状。

## 调整结论

不要继续把编辑状态、编辑焦点和存储迁移堆进 `App.tsx`。将“工单”作为业务能力组织；`App.tsx` 只保留应用装配，工单页面负责协调，数据模型、持久化和各交互单元各有明确所有者。

```text
src/
  App.tsx
  features/tickets/
    TicketsPage.tsx
    model.ts
    useTickets.ts
    ticketStorage.ts
    TicketCreateForm.tsx
    TicketList.tsx
    TicketRow.tsx
    TicketFields.tsx          # 创建、编辑确实共享字段时再建
    model.test.ts
    ticketStorage.test.ts
    TicketRow.test.tsx
    TicketsPage.test.tsx
```

具体职责：

- `App.tsx`
  - 保留应用顶层装配和真正属于应用壳的顶栏。
  - 渲染 `TicketsPage`。
  - 顶栏若只是工单筛选/统计的一部分，应放进 `TicketsPage`，不能因视觉上在顶部就归为应用基础设施。

- `TicketsPage.tsx`
  - 组合创建表单、筛选控件、归档开关和列表。
  - 拥有筛选条件及“是否显示归档”这类页面视图状态。
  - 从 `tickets + filter + showArchived` 派生可见列表，不额外保存 `visibleTickets`。

- `model.ts`
  - 定义 `Ticket`、稳定的 `TicketId`、由现有可编辑字段组成的 `TicketDraft`。
  - 提供纯操作，如创建工单、按 ID 更新工单、切换归档状态。
  - 更新接口只接收允许编辑的字段，不能让 UI 回传整个 `Ticket` 并意外覆盖 ID、创建时间或归档状态。

- `useTickets.ts`
  - 唯一拥有规范化后的 `tickets` 集合。
  - 暴露 `createTicket`、`updateTicket`、`toggleArchived` 和现有单条操作。
  - 初始化时通过 `ticketStorage` 加载，集合变化时统一保存。
  - 若现有更新函数仍然很清楚，可继续用函数式 `setState`；无需仅因多了编辑就强制引入 reducer。

- `ticketStorage.ts`
  - 唯一接触 `localStorage`、`JSON.parse`、存储版本和迁移逻辑的文件。
  - 将外部、不可信的存储数据转换为当前 `Ticket[]`。
  - 导出面向业务的 `loadTickets`、`saveTickets`，不把原始 JSON 结构泄漏给 React 组件。

- `TicketCreateForm.tsx`
  - 拥有创建草稿、创建表单校验及创建输入框的 ref。
  - 创建成功后清空草稿并重新聚焦；编辑流程不能复用或干扰这份草稿和焦点。

- `TicketRow.tsx`
  - 展示单条工单并拥有该行的编辑交互。
  - 建议使用互斥状态，而不是分散的 `isEditing` 和可空草稿：

    ```ts
    type EditState =
      | { mode: 'view' }
      | { mode: 'editing'; draft: TicketDraft };
    ```

  - 开始编辑时从当前工单创建草稿；取消直接丢弃；保存成功后才退出编辑。
  - 编辑框使用自己的 ref。进入编辑时聚焦首个字段，取消或保存后把焦点还给该行的“编辑”按钮。
  - 默认允许每行独立进入编辑，因为题述没有“全局只能编辑一条”的规则。若产品明确要求单编辑器，再把 `editingTicketId` 提升到 `TicketsPage`，不要预先增加这项全局约束。

- `TicketFields.tsx`
  - 只有在创建和编辑确实共享字段、校验提示及无障碍关联时才提取。
  - 它只渲染字段并接收 `draft/onChange/errors`；提交、取消、成功清空和焦点恢复仍由各自表单拥有。

依赖方向应保持为：

```text
App
  -> TicketsPage
       -> useTickets -> ticketStorage -> model
       -> TicketCreateForm -> model
       -> TicketList -> TicketRow -> model

model -> 不依赖 React、DOM 或 localStorage
ticketStorage -> 不依赖 UI
TicketRow/TicketCreateForm -> 不直接访问 localStorage
```

## 编辑功能影响范围

编辑功能应触及：

1. `model.ts`：新增受限的更新输入和纯更新规则。
2. `useTickets.ts`：新增 `updateTicket(id, draft)` 命令，按稳定 ID 替换目标项。
3. `TicketRow.tsx`：编辑草稿、保存、取消、校验和焦点行为。
4. `TicketFields.tsx`：仅当创建与编辑共享真实字段语义时调整。
5. `TicketsPage.tsx`/`TicketList.tsx`：透传更新命令，通常不拥有编辑草稿。
6. 测试：覆盖预填、取消不修改、保存只修改目标项、不可编辑元数据保持不变，以及保存后筛选结果重新派生。

编辑中的半成品不能写入规范 `tickets`，因此取消编辑、切换筛选或组件卸载不会污染已保存数据。

## 存储格式变化影响范围

“支持编辑”本身不要求改变存储格式。如果编辑的只是原来已经持久化的字段，保存更新后的同一 `Ticket` 结构即可，此时只增加更新路径，不应借机迁移数据。

只有新增持久字段，例如 `updatedAt`，或者需要明确版本化时，才改变格式。届时影响应收敛为：

- `model.ts`：增加规范化后的领域字段及更新规则。
- `ticketStorage.ts`：增加新格式的解析、序列化和旧格式迁移。
- `ticketStorage.test.ts`：覆盖旧数据、新数据、损坏 JSON、未知版本和往返序列化。
- `TicketRow.tsx`：仅在产品需要展示新字段时改变；不参与迁移。
- `App.tsx`、筛选组件、创建/编辑表单不应理解存储版本。

若决定版本化，推荐使用带版本的 envelope，而不是让各组件判断多个历史形状：

```ts
type StoredTicketsV2 = {
  version: 2;
  tickets: StoredTicketV2[];
};
```

现有格式必须先从真实解析代码确认，再定义对应的旧版本类型；不能假定当前一定是裸数组。读取时统一迁移成当前 `Ticket[]`，写入时只输出最新版。解析失败和未知版本应沿用或明确替代当前恢复策略，不能静默把无法识别的数据当成空数组后立即覆盖。

最终验证至少应覆盖：创建后焦点仍正确、编辑取消、编辑保存、归档项编辑、编辑后筛选即时更新，以及重新加载后更新内容仍存在。按本地 Skill 的指导，这一结构把业务状态、交互生命周期和浏览器存储边界分开，同时没有为小型应用预建多余的仓储或依赖注入层。